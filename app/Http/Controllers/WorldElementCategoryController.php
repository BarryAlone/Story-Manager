<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\WorldElementCategory;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class WorldElementCategoryController extends Controller
{
    private const DUPLICATE_NAME_MESSAGE = 'Kategoria o tej nazwie już istnieje w projekcie.';

    public function index(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $categories = $project->worldElementCategories()
            ->withCount(['worldElements as items_count'])
            ->orderBy('normalized_name')
            ->get();

        return response()->json($categories);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);
        $name = $this->validateName($request, $project);

        try {
            $category = $project->worldElementCategories()->create(['name' => $name]);
        } catch (UniqueConstraintViolationException) {
            $this->throwDuplicateNameValidationException();
        }

        return response()->json(
            $category->loadCount(['worldElements as items_count']),
            201
        );
    }

    public function update(
        Request $request,
        WorldElementCategory $category,
    ): JsonResponse {
        Gate::authorize('update', $category);
        $name = $this->validateName($request, $category->project, $category);

        try {
            $category->update(['name' => $name]);
        } catch (UniqueConstraintViolationException) {
            $this->throwDuplicateNameValidationException();
        }

        return response()->json(
            $category->refresh()->loadCount(['worldElements as items_count'])
        );
    }

    public function destroy(WorldElementCategory $category): Response|JsonResponse
    {
        Gate::authorize('delete', $category);

        if ($category->worldElements()->exists()) {
            return response()->json([
                'message' => 'Nie można usunąć kategorii zawierającej elementy.',
            ], 409);
        }

        $category->delete();

        return response()->noContent();
    }

    private function validateName(
        Request $request,
        Project $project,
        ?WorldElementCategory $category = null,
    ): string {
        $input = $request->input('name');
        $name = is_string($input)
            ? WorldElementCategory::trimName($input)
            : $input;
        $validator = Validator::make(['name' => $name], [
            'name' => ['required', 'string', 'max:128'],
        ]);

        $validator->after(function ($validator) use ($category, $name, $project): void {
            if ($validator->errors()->has('name') || ! is_string($name)) {
                return;
            }

            $query = $project->worldElementCategories()
                ->where('normalized_name', WorldElementCategory::normalizeName($name));

            if ($category) {
                $query->whereKeyNot($category->id);
            }

            if ($query->exists()) {
                $validator->errors()->add('name', self::DUPLICATE_NAME_MESSAGE);
            }
        });

        return $validator->validate()['name'];
    }

    private function throwDuplicateNameValidationException(): never
    {
        throw ValidationException::withMessages([
            'name' => [self::DUPLICATE_NAME_MESSAGE],
        ]);
    }
}
