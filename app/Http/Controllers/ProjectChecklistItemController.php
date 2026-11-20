<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectChecklistItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProjectChecklistItemController extends Controller
{
    private const CONTENT_MAX_LENGTH = 500;

    public function index(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);
        $validated = $request->validate([
            'status' => ['sometimes', Rule::in(['all', 'active', 'completed'])],
        ]);

        return response()->json($this->itemsFor($project, $validated['status'] ?? 'all'));
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);
        $validated = $request->validate([
            'content' => ['required', 'string', 'max:'.self::CONTENT_MAX_LENGTH],
            'due_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ]);
        $validated['content'] = $this->normalizeContent($validated['content']);

        $item = DB::transaction(function () use ($project, $validated): ProjectChecklistItem {
            $sortOrder = ($project->projectChecklistItems()
                ->whereNull('completed_at')
                ->lockForUpdate()
                ->max('sort_order') ?? -1) + 1;

            return $project->projectChecklistItems()->create([
                ...$validated,
                'sort_order' => $sortOrder,
            ]);
        });

        return response()->json($this->itemResponse($item), 201);
    }

    public function show(ProjectChecklistItem $checklistItem): JsonResponse
    {
        Gate::authorize('view', $checklistItem);

        return response()->json($this->itemResponse($checklistItem));
    }

    public function update(Request $request, ProjectChecklistItem $checklistItem): JsonResponse
    {
        Gate::authorize('update', $checklistItem);
        $validated = $request->validate([
            'content' => ['sometimes', 'required', 'string', 'max:'.self::CONTENT_MAX_LENGTH],
            'due_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ]);

        if (array_key_exists('content', $validated)) {
            $validated['content'] = $this->normalizeContent($validated['content']);
        }

        DB::transaction(fn () => $checklistItem->update($validated));

        return response()->json($this->itemResponse($checklistItem->refresh()));
    }

    public function setCompletion(Request $request, ProjectChecklistItem $checklistItem): JsonResponse
    {
        Gate::authorize('update', $checklistItem);
        $validated = $request->validate([
            'is_completed' => ['required', 'boolean'],
        ]);
        $shouldComplete = (bool) $validated['is_completed'];

        $item = DB::transaction(function () use ($checklistItem, $shouldComplete): ProjectChecklistItem {
            $lockedItem = ProjectChecklistItem::query()->lockForUpdate()->findOrFail($checklistItem->id);
            if (($lockedItem->completed_at !== null) === $shouldComplete) {
                return $lockedItem;
            }

            $targetQuery = ProjectChecklistItem::query()
                ->where('project_id', $lockedItem->project_id)
                ->whereKeyNot($lockedItem->id);
            $this->applyStatusScope($targetQuery, $shouldComplete ? 'completed' : 'active');
            $sortOrder = ($targetQuery->lockForUpdate()->max('sort_order') ?? -1) + 1;

            $lockedItem->update([
                'completed_at' => $shouldComplete ? now() : null,
                'sort_order' => $sortOrder,
            ]);

            return $lockedItem->refresh();
        });

        return response()->json($this->itemResponse($item));
    }

    public function reorder(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);
        $validated = $request->validate([
            'status' => ['required', Rule::in(['active', 'completed'])],
            'item_ids' => ['present', 'array'],
            'item_ids.*' => ['required', 'integer', 'distinct'],
        ]);
        $status = $validated['status'];
        $requestedIds = array_map('intval', $validated['item_ids']);

        $scopeQuery = $project->projectChecklistItems();
        $this->applyStatusScope($scopeQuery, $status);
        $scopeIds = $scopeQuery->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $sortedRequestedIds = $requestedIds;
        $sortedScopeIds = $scopeIds;
        sort($sortedRequestedIds);
        sort($sortedScopeIds);

        if ($sortedRequestedIds !== $sortedScopeIds) {
            throw ValidationException::withMessages([
                'item_ids' => ['Kolejność musi zawierać dokładnie wszystkie zadania wybranego zakresu.'],
            ]);
        }

        DB::transaction(function () use ($project, $requestedIds, $status): void {
            $lockedQuery = $project->projectChecklistItems()->lockForUpdate();
            $this->applyStatusScope($lockedQuery, $status);
            $lockedIds = $lockedQuery->pluck('id')->map(fn ($id): int => (int) $id)->all();
            $sortedLockedIds = $lockedIds;
            $sortedRequestedIds = $requestedIds;
            sort($sortedLockedIds);
            sort($sortedRequestedIds);

            if ($sortedLockedIds !== $sortedRequestedIds) {
                throw ValidationException::withMessages([
                    'item_ids' => ['Lista zadań zmieniła się. Odśwież dane i spróbuj ponownie.'],
                ]);
            }

            foreach ($requestedIds as $sortOrder => $itemId) {
                ProjectChecklistItem::query()
                    ->where('project_id', $project->id)
                    ->whereKey($itemId)
                    ->update(['sort_order' => $sortOrder]);
            }
        });

        return response()->json($this->itemsFor($project, $status));
    }

    public function destroy(ProjectChecklistItem $checklistItem): Response
    {
        Gate::authorize('delete', $checklistItem);
        DB::transaction(fn () => $checklistItem->delete());

        return response()->noContent();
    }

    private function normalizeContent(string $content): string
    {
        $normalized = trim($content);
        if ($normalized === '') {
            throw ValidationException::withMessages([
                'content' => ['Treść zadania jest wymagana.'],
            ]);
        }

        return $normalized;
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
    private function itemsFor(Project $project, string $status): array
    {
        $query = $project->projectChecklistItems();
        $this->applyStatusScope($query, $status);

        if ($status === 'all') {
            $query->orderByRaw('CASE WHEN completed_at IS NULL THEN 0 ELSE 1 END');
        }

        return $query
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (ProjectChecklistItem $item): array => $this->itemResponse($item))
            ->all();
    }

    /** @return array<string, mixed> */
    private function itemResponse(ProjectChecklistItem $item): array
    {
        return [
            'id' => $item->id,
            'project_id' => $item->project_id,
            'content' => $item->content,
            'is_completed' => $item->completed_at !== null,
            'completed_at' => $item->completed_at,
            'due_date' => $item->due_date?->format('Y-m-d'),
            'sort_order' => $item->sort_order,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
        ];
    }
}
