<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectNote;
use App\Models\ProjectTask;
use App\Services\ChapterContentSanitizer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProjectTaskController extends Controller
{
    private const TITLE_MAX_LENGTH = 500;

    public function __construct(private readonly ChapterContentSanitizer $contentSanitizer) {}

    public function index(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);
        $validated = $request->validate([
            'status' => ['sometimes', Rule::in(['all', 'active', 'completed'])],
            'project_note_id' => ['sometimes', 'integer'],
        ]);
        $noteId = null;

        if (array_key_exists('project_note_id', $validated)) {
            $noteId = $this->resolveNote($project, (int) $validated['project_note_id'])->id;
        }

        return response()->json($this->tasksFor(
            $project,
            $validated['status'] ?? 'all',
            $noteId,
        ));
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);
        $validated = $request->validate($this->rules(partial: false));
        $validated = $this->normalizePayload($validated, $project);

        $task = DB::transaction(function () use ($project, $validated): ProjectTask {
            $sortOrder = ($project->tasks()
                ->whereNull('completed_at')
                ->lockForUpdate()
                ->max('sort_order') ?? -1) + 1;

            return $project->tasks()->create([
                ...$validated,
                'sort_order' => $sortOrder,
            ]);
        });

        return response()->json($this->taskResponse($task), 201);
    }

    public function show(ProjectTask $projectTask): JsonResponse
    {
        Gate::authorize('view', $projectTask);

        return response()->json($this->taskResponse($projectTask));
    }

    public function update(Request $request, ProjectTask $projectTask): JsonResponse
    {
        Gate::authorize('update', $projectTask);
        $validated = $request->validate($this->rules(partial: true));
        $validated = $this->normalizePayload($validated, $projectTask->project);

        DB::transaction(fn () => $projectTask->update($validated));

        return response()->json($this->taskResponse($projectTask->refresh()));
    }

    public function setCompletion(Request $request, ProjectTask $projectTask): JsonResponse
    {
        Gate::authorize('update', $projectTask);
        $validated = $request->validate([
            'is_completed' => ['required', 'boolean'],
        ]);
        $shouldComplete = (bool) $validated['is_completed'];

        $task = DB::transaction(function () use ($projectTask, $shouldComplete): ProjectTask {
            $lockedTask = ProjectTask::query()->lockForUpdate()->findOrFail($projectTask->id);
            if (($lockedTask->completed_at !== null) === $shouldComplete) {
                return $lockedTask;
            }

            $targetQuery = ProjectTask::query()
                ->where('project_id', $lockedTask->project_id)
                ->whereKeyNot($lockedTask->id);
            $this->applyStatusScope($targetQuery, $shouldComplete ? 'completed' : 'active');
            $sortOrder = ($targetQuery->lockForUpdate()->max('sort_order') ?? -1) + 1;

            $lockedTask->update([
                'completed_at' => $shouldComplete ? now() : null,
                'sort_order' => $sortOrder,
            ]);

            return $lockedTask->refresh();
        });

        return response()->json($this->taskResponse($task));
    }

    public function reorder(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);
        $validated = $request->validate([
            'status' => ['required', Rule::in(['active', 'completed'])],
            'task_ids' => ['present', 'array'],
            'task_ids.*' => ['required', 'integer', 'distinct'],
        ]);
        $status = $validated['status'];
        $requestedIds = array_map('intval', $validated['task_ids']);

        $scopeQuery = $project->tasks();
        $this->applyStatusScope($scopeQuery, $status);
        $scopeIds = $scopeQuery->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $sortedRequestedIds = $requestedIds;
        $sortedScopeIds = $scopeIds;
        sort($sortedRequestedIds);
        sort($sortedScopeIds);

        if ($sortedRequestedIds !== $sortedScopeIds) {
            throw ValidationException::withMessages([
                'task_ids' => ['Kolejność musi zawierać dokładnie wszystkie zadania wybranego zakresu.'],
            ]);
        }

        DB::transaction(function () use ($project, $requestedIds, $status): void {
            $lockedQuery = $project->tasks()->lockForUpdate();
            $this->applyStatusScope($lockedQuery, $status);
            $lockedIds = $lockedQuery->pluck('id')->map(fn ($id): int => (int) $id)->all();
            $sortedLockedIds = $lockedIds;
            $sortedRequestedIds = $requestedIds;
            sort($sortedLockedIds);
            sort($sortedRequestedIds);

            if ($sortedLockedIds !== $sortedRequestedIds) {
                throw ValidationException::withMessages([
                    'task_ids' => ['Lista zadań zmieniła się. Odśwież dane i spróbuj ponownie.'],
                ]);
            }

            foreach ($requestedIds as $sortOrder => $taskId) {
                ProjectTask::query()
                    ->where('project_id', $project->id)
                    ->whereKey($taskId)
                    ->update(['sort_order' => $sortOrder]);
            }
        });

        return response()->json($this->tasksFor($project, $status));
    }

    public function destroy(ProjectTask $projectTask): Response
    {
        Gate::authorize('delete', $projectTask);
        DB::transaction(fn () => $projectTask->delete());

        return response()->noContent();
    }

    /** @return array<string, array<int, string>> */
    private function rules(bool $partial): array
    {
        return [
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:'.self::TITLE_MAX_LENGTH],
            'content' => ['sometimes', 'nullable', 'string', 'max:'.ChapterContentSanitizer::MAX_CONTENT_LENGTH],
            'due_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'project_note_id' => ['sometimes', 'nullable', 'integer'],
        ];
    }

    /** @param array<string, mixed> $validated
     * @return array<string, mixed>
     */
    private function normalizePayload(array $validated, Project $project): array
    {
        if (array_key_exists('title', $validated)) {
            $validated['title'] = trim($validated['title']);
            if ($validated['title'] === '') {
                throw ValidationException::withMessages([
                    'title' => ['Tytuł zadania jest wymagany.'],
                ]);
            }
        }

        if (array_key_exists('content', $validated)) {
            $validated['content'] = $this->contentSanitizer->sanitize($validated['content']);
        }

        if (array_key_exists('project_note_id', $validated) && $validated['project_note_id'] !== null) {
            $validated['project_note_id'] = $this->resolveNote(
                $project,
                (int) $validated['project_note_id'],
            )->id;
        }

        return $validated;
    }

    private function resolveNote(Project $project, int $noteId): ProjectNote
    {
        $note = ProjectNote::query()->findOrFail($noteId);
        Gate::authorize('view', $note);

        if ($note->project_id !== $project->id) {
            throw ValidationException::withMessages([
                'project_note_id' => ['Notatka musi należeć do tego samego projektu co zadanie.'],
            ]);
        }

        return $note;
    }

    private function applyStatusScope(Builder|Relation $query, string $status): Builder|Relation
    {
        return match ($status) {
            'active' => $query->whereNull('completed_at'),
            'completed' => $query->whereNotNull('completed_at'),
            default => $query,
        };
    }

    /** @return array<int, array<string, mixed>> */
    private function tasksFor(Project $project, string $status, ?int $noteId = null): array
    {
        $query = $project->tasks()->with('note:id,title');
        $this->applyStatusScope($query, $status);

        if ($noteId !== null) {
            $query->where('project_note_id', $noteId);
        }
        if ($status === 'all') {
            $query->orderByRaw('CASE WHEN completed_at IS NULL THEN 0 ELSE 1 END');
        }

        return $query
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (ProjectTask $task): array => $this->taskResponse($task))
            ->all();
    }

    /** @return array<string, mixed> */
    private function taskResponse(ProjectTask $task): array
    {
        $task->loadMissing('note:id,title');

        return [
            'id' => $task->id,
            'project_id' => $task->project_id,
            'project_note_id' => $task->project_note_id,
            'note' => $task->note === null ? null : [
                'id' => $task->note->id,
                'title' => $task->note->title,
            ],
            'title' => $task->title,
            'content' => $task->content,
            'is_completed' => $task->completed_at !== null,
            'completed_at' => $task->completed_at,
            'due_date' => $task->due_date?->format('Y-m-d'),
            'sort_order' => $task->sort_order,
            'created_at' => $task->created_at,
            'updated_at' => $task->updated_at,
        ];
    }
}
