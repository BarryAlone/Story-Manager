<?php

namespace App\Http\Controllers;

use App\Models\AttributeDefinition;
use App\Models\Project;
use App\Models\WorldElementCategory;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AttributeDefinitionController extends Controller
{
    private const DUPLICATE_NAME_MESSAGE = 'Definicja atrybutu o tej nazwie już istnieje w tym zakresie.';

    private const TYPE_CHANGE_CONFLICT_MESSAGE = 'Nie można zmienić typu definicji posiadającej wartości.';

    private const DELETE_CONFLICT_MESSAGE = 'Nie można usunąć definicji posiadającej wartości.';

    public function indexCharacters(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return response()->json(
            $project->characterAttributeDefinitions()->withCount('values')->get()
        );
    }

    public function storeCharacter(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return $this->storeInScope(
            $request,
            project: $project,
            targetType: AttributeDefinition::TARGET_CHARACTER,
            scopeKey: AttributeDefinition::TARGET_CHARACTER,
        );
    }

    public function indexWorldElements(WorldElementCategory $category): JsonResponse
    {
        Gate::authorize('view', $category);

        return response()->json(
            $category->attributeDefinitions()->withCount('values')->get()
        );
    }

    public function storeWorldElement(
        Request $request,
        WorldElementCategory $category,
    ): JsonResponse {
        Gate::authorize('view', $category);

        return $this->storeInScope(
            $request,
            project: $category->project,
            targetType: AttributeDefinition::TARGET_WORLD_ELEMENT,
            scopeKey: 'world-category:'.$category->id,
            category: $category,
        );
    }

    public function update(Request $request, AttributeDefinition $definition): JsonResponse
    {
        Gate::authorize('update', $definition);
        $validated = $this->validatePayload(
            $request,
            projectId: $definition->project_id,
            scopeKey: $definition->getRawOriginal('scope_key'),
            definition: $definition,
        );
        $valuesCount = $definition->values()->count();
        $changesType = array_key_exists('value_type', $validated)
            && $validated['value_type'] !== $definition->value_type;

        if ($changesType && $valuesCount > 0) {
            return $this->conflict(self::TYPE_CHANGE_CONFLICT_MESSAGE, $valuesCount);
        }

        try {
            $definition->update($validated);
        } catch (UniqueConstraintViolationException) {
            $this->throwDuplicateNameValidationException();
        }

        return response()->json(
            $definition->refresh()->loadCount('values')
        );
    }

    public function destroy(
        Request $request,
        AttributeDefinition $definition,
    ): Response|JsonResponse {
        Gate::authorize('delete', $definition);
        $force = $this->validatedForce($request);
        $valuesCount = $definition->values()->count();

        if ($valuesCount > 0 && ! $force) {
            return $this->conflict(self::DELETE_CONFLICT_MESSAGE, $valuesCount);
        }

        DB::transaction(fn () => $definition->delete());

        return response()->noContent();
    }

    private function storeInScope(
        Request $request,
        Project $project,
        string $targetType,
        string $scopeKey,
        ?WorldElementCategory $category = null,
    ): JsonResponse {
        $validated = $this->validatePayload(
            $request,
            projectId: $project->id,
            scopeKey: $scopeKey,
            creating: true,
        );
        $scope = AttributeDefinition::query()
            ->where('project_id', $project->id)
            ->where('scope_key', $scopeKey);
        $nextSortOrder = ($scope->max('sort_order') ?? -1) + 1;

        try {
            $definition = AttributeDefinition::create([
                'project_id' => $project->id,
                'world_element_category_id' => $category?->id,
                'target_type' => $targetType,
                'name' => $validated['name'],
                'value_type' => $validated['value_type'],
                'sort_order' => $nextSortOrder,
            ]);
        } catch (UniqueConstraintViolationException) {
            $this->throwDuplicateNameValidationException();
        }

        return response()->json($definition->loadCount('values'), 201);
    }

    /** @return array<string, mixed> */
    private function validatePayload(
        Request $request,
        int $projectId,
        string $scopeKey,
        bool $creating = false,
        ?AttributeDefinition $definition = null,
    ): array {
        $input = $request->only(['name', 'value_type']);

        if (array_key_exists('name', $input) && is_string($input['name'])) {
            $input['name'] = trim($input['name']);
        }

        $presence = $creating ? 'required' : 'sometimes';
        $validator = Validator::make($input, [
            'name' => [$presence, 'string', 'max:128'],
            'value_type' => [
                $presence,
                'string',
                Rule::in([AttributeDefinition::TYPE_TEXT, AttributeDefinition::TYPE_NUMBER]),
            ],
        ]);

        $validator->after(function ($validator) use ($definition, $input, $projectId, $scopeKey): void {
            if ($validator->errors()->has('name') || ! array_key_exists('name', $input)) {
                return;
            }

            $query = AttributeDefinition::query()
                ->where('project_id', $projectId)
                ->where('scope_key', $scopeKey)
                ->where('normalized_name', AttributeDefinition::normalizeName($input['name']));

            if ($definition) {
                $query->whereKeyNot($definition->id);
            }

            if ($query->exists()) {
                $validator->errors()->add('name', self::DUPLICATE_NAME_MESSAGE);
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

    private function conflict(string $message, int $valuesCount): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'values_count' => $valuesCount,
        ], 409);
    }

    private function throwDuplicateNameValidationException(): never
    {
        throw ValidationException::withMessages([
            'name' => [self::DUPLICATE_NAME_MESSAGE],
        ]);
    }
}
