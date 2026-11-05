<?php

namespace App\Http\Controllers;

use App\Models\Chapter;
use App\Models\Character;
use App\Models\Project;
use App\Models\ProjectAttribute;
use App\Services\AttributeValuesInputParser;
use App\Services\AttributeValueSynchronizer;
use App\Services\PublicImageStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Throwable;

class CharacterController extends Controller
{
    public function __construct(
        private readonly PublicImageStorage $imageStorage,
        private readonly AttributeValuesInputParser $attributeValuesInput,
        private readonly AttributeValueSynchronizer $attributeValues,
    ) {}

    public function index(Request $request, ?int $project = null)
    {
        if ($project) {
            $ownedProject = Project::whereKey($project)
                ->where('user_id', $request->user()->id)
                ->firstOrFail();
            $characters = $ownedProject->characters()->get();
            $attributes = $ownedProject->projectAttributes()->get();
        } else {
            $characters = Character::whereHas(
                'project',
                fn ($query) => $query->where('user_id', $request->user()->id)
            )->get();
            $attributes = ProjectAttribute::whereHas(
                'project',
                fn ($query) => $query->where('user_id', $request->user()->id)
            )->get();
        }

        return response()->json([
            'characters' => $characters,
            'attributes' => $attributes,
        ], 200);
    }

    public function store(Request $request)
    {
        $attributesInput = $request->input('attributes');

        if (! is_null($attributesInput) && ! is_array($attributesInput)) {
            $decoded = json_decode($attributesInput, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $request->merge(['attributes' => $decoded]);
            } else {
                $request->merge(['attributes' => null]);
            }
        }

        $validated = $request->validate([
            'project_id' => 'required|integer|exists:projects,id',
            'chapter_id' => 'nullable|integer|exists:chapters,id',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('characters')->where('project_id', $request->project_id),
            ],
            'group_name' => 'nullable|string|max:128',
            'description' => 'nullable|string',
            'description_long' => 'nullable|string',
            'character_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'attributes' => 'nullable',
        ]);

        Project::whereKey($validated['project_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if (! empty($validated['chapter_id'])) {
            $chapter = Chapter::findOrFail($validated['chapter_id']);
            Gate::authorize('view', $chapter);
            abort_unless($chapter->project_id === (int) $validated['project_id'], 404);
        }

        $attributeValuesInput = $this->attributeValuesInput->parse($request);

        $newImagePath = null;

        try {
            if ($request->hasFile('character_image')) {
                $newImagePath = $this->imageStorage->store($request->file('character_image'), 'characters');
                $validated['character_image'] = $newImagePath;
            }

            $character = DB::transaction(function () use (
                $validated,
                $attributeValuesInput,
            ): Character {
                $character = Character::create($validated);

                if ($attributeValuesInput['present']) {
                    $this->attributeValues->sync($character, $attributeValuesInput['values']);
                }

                return $character;
            });
        } catch (Throwable $error) {
            $this->imageStorage->delete($newImagePath);

            throw $error;
        }

        return response()->json($this->characterResponse($character), 201);
    }

    public function update(Request $request, $id)
    {
        $character = Character::findOrFail($id);
        Gate::authorize('update', $character);
        $attributeValuesInput = $this->attributeValuesInput->parse($request);
        $attributesInput = $request->input('attributes');

        if (! is_null($attributesInput) && ! is_array($attributesInput)) {
            $decoded = json_decode($attributesInput, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $request->merge(['attributes' => $decoded]);
            } else {
                $request->merge(['attributes' => null]);
            }
        }

        $validated = $request->validate([
            'character_id' => 'nullable|integer|exists:characters,id',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('characters')->where('project_id', $character->project_id)->ignore($character->id),
            ],
            'group_name' => 'nullable|string|max:128',
            'description' => 'nullable|string',
            'description_long' => 'nullable|string',
            'character_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'attributes' => 'nullable',
        ]);

        $oldImagePath = $character->character_image;
        $newImagePath = null;

        try {
            if ($request->hasFile('character_image')) {
                $newImagePath = $this->imageStorage->store($request->file('character_image'), 'characters');
                $validated['character_image'] = $newImagePath;
            }

            DB::transaction(function () use (
                $character,
                $validated,
                $attributeValuesInput,
            ): void {
                $character->update($validated);

                if ($attributeValuesInput['present']) {
                    $this->attributeValues->sync($character, $attributeValuesInput['values']);
                }
            });
        } catch (Throwable $error) {
            $this->imageStorage->delete($newImagePath);

            throw $error;
        }

        if ($newImagePath) {
            $this->imageStorage->delete($oldImagePath);
        }

        return response()->json($this->characterResponse($character->refresh()), 200);
    }

    public function destroy($id)
    {
        $character = Character::findOrFail($id);
        Gate::authorize('delete', $character);

        $imagePath = $character->character_image;
        DB::transaction(fn () => $character->delete());
        $this->imageStorage->delete($imagePath);

        return response()->json(['message' => 'Postać usunięta'], 200);
    }

    public function show($id)
    {
        $character = Character::findOrFail($id);
        Gate::authorize('view', $character);
        $projectAttributes = ProjectAttribute::where('project_id', $character->project_id)->get();

        return response()->json([
            'character' => $this->characterResponse($character),
            'attributes' => $projectAttributes,
        ], 200);
    }

    public function showInProject(Request $request, int $project, int $id)
    {
        Project::whereKey($project)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $character = Character::whereKey($id)
            ->where('project_id', $project)
            ->firstOrFail();
        Gate::authorize('view', $character);

        $projectAttributes = ProjectAttribute::where('project_id', $project)->get();

        return response()->json([
            'character' => $this->characterResponse($character),
            'attributes' => $projectAttributes,
        ], 200);
    }

    /** @return array<string, mixed> */
    private function characterResponse(Character $character): array
    {
        return [
            ...$character->toArray(),
            'attribute_values' => $this->attributeValues->mapFor($character),
        ];
    }
}
