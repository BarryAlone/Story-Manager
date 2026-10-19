<?php

namespace App\Http\Controllers;

use App\Models\Chapter;
use App\Models\Project;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ChapterController extends Controller
{
    public function index(Request $request, ?int $project = null): JsonResponse
    {
        if ($project) {
            $ownedProject = Project::whereKey($project)
                ->where('user_id', $request->user()->id)
                ->firstOrFail();
            $query = $ownedProject->chapters();
        } else {
            $query = Chapter::whereHas(
                'project',
                fn (Builder $query) => $query->where('user_id', $request->user()->id)
            );
        }

        $chapters = $query
            ->orderBy('project_id')
            ->orderByDesc('is_in_manuscript')
            ->orderByRaw('CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END')
            ->orderBy('parent_id')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json($chapters);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateChapter($request);
        $project = $this->ownedProject($request, $validated['project_id']);
        $this->prepareStructureData($request, $validated, $project);

        if ($request->hasFile('chapter_image')) {
            $validated['chapter_image'] = $request->file('chapter_image')->store('chapters', 'public');
        }

        $chapter = Chapter::create($validated);

        return response()->json($chapter, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $chapter = Chapter::findOrFail($id);
        Gate::authorize('update', $chapter);

        $validated = $this->validateChapter($request, $chapter);
        $project = $this->ownedProject($request, $validated['project_id']);
        $this->prepareStructureData($request, $validated, $project, $chapter);

        if ($request->hasFile('chapter_image')) {
            if ($chapter->chapter_image) {
                Storage::disk('public')->delete($chapter->chapter_image);
            }

            $validated['chapter_image'] = $request->file('chapter_image')->store('chapters', 'public');
        }

        $chapter->update($validated);

        return response()->json($chapter);
    }

    public function destroy(int $id): JsonResponse
    {
        $chapter = Chapter::findOrFail($id);
        Gate::authorize('delete', $chapter);

        if ($chapter->children()->exists()) {
            return response()->json([
                'message' => 'Nie można usunąć rozdziału posiadającego podrozdziały.',
            ], 409);
        }

        if ($chapter->chapter_image) {
            Storage::disk('public')->delete($chapter->chapter_image);
        }

        $chapter->delete();

        return response()->json(['message' => 'Rozdział usunięty']);
    }

    public function show(int $id): JsonResponse
    {
        $chapter = Chapter::findOrFail($id);
        Gate::authorize('view', $chapter);

        return response()->json(['chapter' => $chapter]);
    }

    public function swap(Request $request, Chapter $chapter): JsonResponse
    {
        Gate::authorize('update', $chapter);

        $validated = $request->validate([
            'target_id' => 'nullable|exists:chapters,id',
            'direction' => 'nullable|in:up,down',
        ]);

        if (! $chapter->chapter_number) {
            return response()->json(['message' => 'Szkiców nie można przesuwać.'], 400);
        }

        $targetChapter = null;

        if ($request->filled('target_id')) {
            $targetChapter = Chapter::findOrFail($validated['target_id']);
            Gate::authorize('update', $targetChapter);
            abort_unless($targetChapter->project_id === $chapter->project_id, 404);
        } elseif ($request->input('direction') === 'up') {
            $targetChapter = Chapter::where('project_id', $chapter->project_id)
                ->where('chapter_number', '<', $chapter->chapter_number)
                ->orderByDesc('chapter_number')
                ->first();
        } elseif ($request->input('direction') === 'down') {
            $targetChapter = Chapter::where('project_id', $chapter->project_id)
                ->where('chapter_number', '>', $chapter->chapter_number)
                ->orderBy('chapter_number')
                ->first();
        }

        if (! $targetChapter || ! $targetChapter->chapter_number) {
            return response()->json(['message' => 'Nie znaleziono rozdziału do zamiany.'], 400);
        }

        DB::transaction(function () use ($chapter, $targetChapter): void {
            $chapterNumber = $chapter->chapter_number;
            $sortOrder = $chapter->sort_order;

            $chapter->update([
                'chapter_number' => $targetChapter->chapter_number,
                'sort_order' => $targetChapter->sort_order,
            ]);
            $targetChapter->update([
                'chapter_number' => $chapterNumber,
                'sort_order' => $sortOrder,
            ]);
        });

        return response()->json(['message' => 'Kolejność została zaktualizowana.']);
    }

    /** @return array<string, mixed> */
    private function validateChapter(Request $request, ?Chapter $chapter = null): array
    {
        return $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'chapter_number' => [
                'nullable',
                'integer',
                Rule::unique('chapters')
                    ->where('project_id', $request->integer('project_id'))
                    ->ignore($chapter?->id),
            ],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('chapters')
                    ->where('project_id', $request->integer('project_id'))
                    ->ignore($chapter?->id),
            ],
            'description' => ['nullable', 'string'],
            'description_long' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'parent_id' => ['nullable', 'integer'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_in_manuscript' => ['sometimes', 'boolean'],
            'chapter_image' => ['nullable', 'image', 'max:2048'],
            'timeline_point_start' => ['nullable', 'integer'],
            'timeline_point_end' => ['nullable', 'integer'],
            'display_label' => ['nullable', 'string'],
        ]);
    }

    private function ownedProject(Request $request, int $projectId): Project
    {
        return Project::whereKey($projectId)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();
    }

    /** @param array<string, mixed> $validated */
    private function prepareStructureData(
        Request $request,
        array &$validated,
        Project $project,
        ?Chapter $chapter = null,
    ): void {
        if ($request->exists('is_in_manuscript')) {
            $validated['is_in_manuscript'] = $request->boolean('is_in_manuscript');
        } elseif ($chapter === null || $request->exists('chapter_number')) {
            $validated['is_in_manuscript'] = ($validated['chapter_number'] ?? 0) > 0;
        }

        $parentId = $request->exists('parent_id')
            ? ($validated['parent_id'] ?? null)
            : $chapter?->parent_id;
        $isInManuscript = $validated['is_in_manuscript'] ?? $chapter?->is_in_manuscript ?? false;
        $errors = [];
        $parent = null;

        if ($parentId !== null) {
            $parent = Chapter::find($parentId);

            if ($chapter && $parentId === $chapter->id) {
                $errors['parent_id'][] = 'Rozdział nie może być własnym rodzicem.';
            } elseif (! $parent || $parent->project_id !== $project->id) {
                $errors['parent_id'][] = 'Wybrany rodzic nie należy do tego projektu.';
            } elseif ($parent->parent_id !== null) {
                $errors['parent_id'][] = 'Hierarchia rozdziałów może mieć maksymalnie dwa poziomy.';
            } elseif (! $parent->is_in_manuscript) {
                $errors['parent_id'][] = 'Rodzicem może być tylko rozdział należący do rękopisu.';
            }

            if (! $isInManuscript) {
                $errors['is_in_manuscript'][] = 'Podrozdział musi należeć do rękopisu.';
            }

            if ($chapter?->children()->exists()) {
                $errors['parent_id'][] = 'Rozdział posiadający podrozdziały nie może stać się podrozdziałem.';
            }
        }

        if ($chapter?->children()->exists()) {
            if ($chapter->project_id !== $project->id) {
                $errors['project_id'][] = 'Rozdział posiadający podrozdziały nie może zmienić projektu.';
            }

            if (! $isInManuscript) {
                $errors['is_in_manuscript'][] = 'Rozdział posiadający podrozdziały musi należeć do rękopisu.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        if (! array_key_exists('sort_order', $validated) && $chapter === null) {
            $siblings = Chapter::where('project_id', $project->id);
            $parentId === null
                ? $siblings->whereNull('parent_id')
                : $siblings->where('parent_id', $parentId);
            $validated['sort_order'] = ((int) $siblings->max('sort_order')) + 1;
        }

        if ($parent !== null) {
            $validated['parent_id'] = $parent->id;
        }
    }
}
