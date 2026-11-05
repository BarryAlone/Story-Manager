<?php

namespace App\Http\Controllers;

use App\Models\WorldElement;
use App\Models\WorldElementCategory;
use App\Services\AttributeValuesInputParser;
use App\Services\AttributeValueSynchronizer;
use App\Services\PublicImageStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Throwable;

class WorldElementController extends Controller
{
    public function __construct(
        private readonly PublicImageStorage $imageStorage,
        private readonly AttributeValuesInputParser $attributeValuesInput,
        private readonly AttributeValueSynchronizer $attributeValues,
    ) {}

    public function index(Request $request, WorldElementCategory $category): JsonResponse
    {
        Gate::authorize('view', $category);

        $searchInput = $request->query('search');
        $search = is_string($searchInput) ? trim($searchInput) : $searchInput;
        $validated = Validator::make(['search' => $search], [
            'search' => ['nullable', 'string', 'max:128'],
        ])->validate();

        $elements = $category->worldElements()
            ->get()
            ->when($validated['search'] ?? null, function ($elements, string $term) {
                $normalizedTerm = mb_strtolower($term);

                return $elements->filter(function (WorldElement $element) use ($normalizedTerm): bool {
                    $haystack = mb_strtolower($element->name.' '.($element->description ?? ''));

                    return str_contains($haystack, $normalizedTerm);
                });
            })
            ->sortBy(fn (WorldElement $element): string => mb_strtolower($element->name))
            ->values();

        return response()->json($elements);
    }

    public function store(Request $request, WorldElementCategory $category): JsonResponse
    {
        Gate::authorize('view', $category);

        $attributeValuesInput = $this->attributeValuesInput->parse($request);
        $validated = $this->validatePayload($request);
        $imagePath = null;

        try {
            if ($request->hasFile('image')) {
                $imagePath = $this->imageStorage->store($request->file('image'), 'world-elements');
            }

            $attributes = $this->attributesFrom($validated);
            $attributes['image_path'] = $imagePath;

            $element = DB::transaction(function () use (
                $category,
                $attributes,
                $attributeValuesInput,
            ): WorldElement {
                $element = $category->worldElements()->create($attributes);

                if ($attributeValuesInput['present']) {
                    $this->attributeValues->sync($element, $attributeValuesInput['values']);
                }

                return $element;
            });
        } catch (Throwable $error) {
            $this->imageStorage->delete($imagePath);

            throw $error;
        }

        return response()->json($this->elementResponse($element), 201);
    }

    public function show(WorldElement $element): JsonResponse
    {
        Gate::authorize('view', $element);

        return response()->json($this->elementResponse($element));
    }

    public function update(Request $request, WorldElement $element): JsonResponse
    {
        Gate::authorize('update', $element);

        $attributeValuesInput = $this->attributeValuesInput->parse($request);
        $validated = $this->validatePayload($request, updating: true);

        if ($request->hasFile('image') && ($validated['remove_image'] ?? false)) {
            throw ValidationException::withMessages([
                'remove_image' => ['Nie można jednocześnie dodać i usunąć obrazu.'],
            ]);
        }

        $oldImagePath = $element->image_path;
        $newImagePath = null;
        $removeImage = $validated['remove_image'] ?? false;

        try {
            if ($request->hasFile('image')) {
                $newImagePath = $this->imageStorage->store($request->file('image'), 'world-elements');
            }

            $attributes = $this->attributesFrom($validated);

            if ($newImagePath) {
                $attributes['image_path'] = $newImagePath;
            } elseif ($removeImage) {
                $attributes['image_path'] = null;
            }

            DB::transaction(function () use (
                $element,
                $attributes,
                $attributeValuesInput,
            ): void {
                $element->update($attributes);

                if ($attributeValuesInput['present']) {
                    $this->attributeValues->sync($element, $attributeValuesInput['values']);
                }
            });
        } catch (Throwable $error) {
            $this->imageStorage->delete($newImagePath);

            throw $error;
        }

        if ($newImagePath || $removeImage) {
            $this->imageStorage->delete($oldImagePath);
        }

        return response()->json($this->elementResponse($element->refresh()));
    }

    public function destroy(WorldElement $element): Response
    {
        Gate::authorize('delete', $element);

        $imagePath = $element->image_path;

        DB::transaction(fn () => $element->delete());
        $this->imageStorage->delete($imagePath);

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function validatePayload(Request $request, bool $updating = false): array
    {
        $input = $request->only(['name', 'description', 'remove_image']);

        if (array_key_exists('name', $input) && is_string($input['name'])) {
            $input['name'] = WorldElement::trimName($input['name']);
        }

        if (array_key_exists('description', $input) && is_string($input['description'])) {
            $description = trim($input['description']);
            $input['description'] = $description === '' ? null : $description;
        }

        if ($request->hasFile('image')) {
            $input['image'] = $request->file('image');
        }

        $presence = $updating ? 'sometimes' : 'required';

        return Validator::make($input, [
            'name' => [$presence, 'string', 'max:128'],
            'description' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'image' => ['sometimes', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_image' => ['sometimes', 'boolean'],
        ])->validate();
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function attributesFrom(array $validated): array
    {
        return array_intersect_key($validated, array_flip(['name', 'description']));
    }

    /** @return array<string, mixed> */
    private function elementResponse(WorldElement $element): array
    {
        return [
            ...$element->toArray(),
            'attribute_values' => $this->attributeValues->mapFor($element),
        ];
    }
}
