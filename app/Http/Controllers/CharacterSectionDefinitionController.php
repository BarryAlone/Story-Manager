<?php

namespace App\Http\Controllers;

use App\Models\CharacterSectionDefinition;
use App\Models\Project;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class CharacterSectionDefinitionController extends Controller
{
    private const DELETE_CONFLICT_MESSAGE = 'Nie można usunąć sekcji posiadającej treści postaci bez wymuszenia operacji.';

    private const DUPLICATE_TITLE_MESSAGE = 'Sekcja postaci o tej nazwie już istnieje w projekcie.';

    public function index(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return response()->json(
            $project->characterSectionDefinitions()->withCount('contents')->get()
        );
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('create', [CharacterSectionDefinition::class, $project]);
        $validated = $this->validateTitle($request, $project);

        try {
            $definition = DB::transaction(function () use ($project, $validated): CharacterSectionDefinition {
                $nextSortOrder = ($project->characterSectionDefinitions()->max('sort_order') ?? -1) + 1;

                return $project->characterSectionDefinitions()->create([
                    'title' => $validated['title'],
                    'sort_order' => $nextSortOrder,
                ]);
            });
        } catch (UniqueConstraintViolationException) {
            $this->throwDuplicateTitleValidationException();
        }

        return response()->json($definition->loadCount('contents'), 201);
    }

    public function update(
        Request $request,
        CharacterSectionDefinition $definition,
    ): JsonResponse {
        Gate::authorize('update', $definition);
        $validated = $this->validateTitle($request, $definition->project, $definition);

        try {
            DB::transaction(fn () => $definition->update($validated));
        } catch (UniqueConstraintViolationException) {
            $this->throwDuplicateTitleValidationException();
        }

        return response()->json($definition->refresh()->loadCount('contents'));
    }

    public function reorder(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);
        $validated = $request->validate([
            'definition_ids' => ['required', 'array'],
            'definition_ids.*' => ['required', 'integer'],
        ]);
        $requestedIds = array_map('intval', $validated['definition_ids']);
        $projectIds = $project->characterSectionDefinitions()
            ->pluck('character_section_definitions.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $uniqueRequestedIds = array_values(array_unique($requestedIds));
        $sortedRequestedIds = $uniqueRequestedIds;
        $sortedProjectIds = $projectIds;
        sort($sortedRequestedIds);
        sort($sortedProjectIds);

        if (count($requestedIds) !== count($uniqueRequestedIds)
            || $sortedRequestedIds !== $sortedProjectIds) {
            throw ValidationException::withMessages([
                'definition_ids' => [
                    'Lista musi zawierać dokładnie raz wszystkie definicje sekcji projektu.',
                ],
            ]);
        }

        DB::transaction(function () use ($project, $requestedIds): void {
            foreach ($requestedIds as $sortOrder => $definitionId) {
                $project->characterSectionDefinitions()
                    ->whereKey($definitionId)
                    ->update(['sort_order' => $sortOrder]);
            }
        });

        return response()->json(
            $project->characterSectionDefinitions()->withCount('contents')->get()
        );
    }

    public function layout(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return response()->json($this->layoutResponse($project));
    }

    public function reorderLayout(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);
        $validated = $request->validate([
            'definition_ids' => ['required', 'array'],
            'definition_ids.*' => ['required', 'integer'],
            'gallery_position' => ['required', 'integer', 'min:0'],
        ]);
        $requestedIds = array_map('intval', $validated['definition_ids']);
        $projectIds = $project->characterSectionDefinitions()
            ->pluck('character_section_definitions.id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $uniqueRequestedIds = array_values(array_unique($requestedIds));
        $sortedRequestedIds = $uniqueRequestedIds;
        $sortedProjectIds = $projectIds;
        sort($sortedRequestedIds);
        sort($sortedProjectIds);

        if (count($requestedIds) !== count($uniqueRequestedIds)
            || $sortedRequestedIds !== $sortedProjectIds) {
            throw ValidationException::withMessages([
                'definition_ids' => [
                    'Lista musi zawierać dokładnie raz wszystkie definicje sekcji projektu.',
                ],
            ]);
        }

        $galleryPosition = (int) $validated['gallery_position'];

        if ($galleryPosition > count($requestedIds)) {
            throw ValidationException::withMessages([
                'gallery_position' => [
                    'Pozycja galerii musi mieścić się w układzie sekcji projektu.',
                ],
            ]);
        }

        DB::transaction(function () use ($galleryPosition, $project, $requestedIds): void {
            foreach ($requestedIds as $sortOrder => $definitionId) {
                $project->characterSectionDefinitions()
                    ->whereKey($definitionId)
                    ->update(['sort_order' => $sortOrder]);
            }

            $project->update([
                'character_gallery_position' => $galleryPosition === count($requestedIds)
                    ? null
                    : $galleryPosition,
            ]);
        });

        return response()->json($this->layoutResponse($project->refresh()));
    }

    public function destroy(
        Request $request,
        CharacterSectionDefinition $definition,
    ): Response|JsonResponse {
        Gate::authorize('delete', $definition);
        $force = $this->validatedForce($request);
        $contentsCount = $definition->contents()->count();

        if ($contentsCount > 0 && ! $force) {
            return response()->json([
                'message' => self::DELETE_CONFLICT_MESSAGE,
                'contents_count' => $contentsCount,
            ], 409);
        }

        DB::transaction(function () use ($definition): void {
            $project = $definition->project;
            $galleryPosition = $project->character_gallery_position;
            $definitionPosition = $project->characterSectionDefinitions()
                ->where(function ($query) use ($definition) {
                    $query->where('sort_order', '<', $definition->sort_order)
                        ->orWhere(function ($query) use ($definition) {
                            $query->where('sort_order', $definition->sort_order)
                                ->where('id', '<', $definition->id);
                        });
                })
                ->count();

            $definition->delete();

            if ($galleryPosition !== null && $definitionPosition < $galleryPosition) {
                $project->update(['character_gallery_position' => max(0, $galleryPosition - 1)]);
            }
        });

        return response()->noContent();
    }

    /** @return array{title?: string} */
    private function validateTitle(
        Request $request,
        Project $project,
        ?CharacterSectionDefinition $definition = null,
    ): array {
        $input = $request->only(['title']);

        if (array_key_exists('title', $input) && is_string($input['title'])) {
            $input['title'] = trim($input['title']);
        }

        $validator = Validator::make($input, [
            'title' => [$definition ? 'sometimes' : 'required', 'string', 'max:128'],
        ]);

        $validator->after(function ($validator) use ($definition, $input, $project): void {
            if ($validator->errors()->has('title') || ! array_key_exists('title', $input)) {
                return;
            }

            $query = $project->characterSectionDefinitions()
                ->where(
                    'normalized_title',
                    CharacterSectionDefinition::normalizeTitle($input['title'])
                );

            if ($definition) {
                $query->whereKeyNot($definition->id);
            }

            if ($query->exists()) {
                $validator->errors()->add('title', self::DUPLICATE_TITLE_MESSAGE);
            }
        });

        return $validator->validate();
    }

    private function validatedForce(Request $request): bool
    {
        if (! $request->query->has('force')) {
            return false;
        }

        $value = $request->query('force');

        if (in_array($value, [true, 1, '1', 'true'], true)) {
            return true;
        }

        if (in_array($value, [false, 0, '0', 'false'], true)) {
            return false;
        }

        throw ValidationException::withMessages([
            'force' => ['Pole force musi mieć wartość true albo false.'],
        ]);
    }

    private function throwDuplicateTitleValidationException(): never
    {
        throw ValidationException::withMessages([
            'title' => [self::DUPLICATE_TITLE_MESSAGE],
        ]);
    }

    /** @return array{definitions: mixed, gallery_position: int} */
    private function layoutResponse(Project $project): array
    {
        $definitions = $project->characterSectionDefinitions()->withCount('contents')->get();
        $galleryPosition = min(
            $project->character_gallery_position ?? $definitions->count(),
            $definitions->count(),
        );

        return [
            'definitions' => $definitions,
            'gallery_position' => $galleryPosition,
        ];
    }
}
