<?php

namespace App\Http\Controllers;

use App\Models\Chapter;
use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ChapterStructureController extends Controller
{
    public function update(Request $request, int $project): JsonResponse
    {
        $ownedProject = Project::whereKey($project)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();
        $validated = $request->validate([
            'action' => ['required', Rule::in(['reorder', 'to_manuscript', 'to_subchapter', 'to_drafts'])],
            'chapter_id' => ['required', 'integer'],
            'before_id' => ['nullable', 'integer'],
            'parent_id' => ['nullable', 'integer'],
            'chapter_number' => ['nullable', 'integer', 'min:1'],
        ]);

        $chapters = DB::transaction(function () use ($ownedProject, $validated): Collection {
            $chapter = $ownedProject->chapters()
                ->whereKey($validated['chapter_id'])
                ->lockForUpdate()
                ->firstOrFail();

            match ($validated['action']) {
                'reorder' => $this->reorder($ownedProject, $chapter, $validated['before_id'] ?? null),
                'to_manuscript' => $this->moveToManuscript(
                    $ownedProject,
                    $chapter,
                    $validated['chapter_number'] ?? null,
                ),
                'to_subchapter' => $this->moveToSubchapter(
                    $ownedProject,
                    $chapter,
                    $validated['parent_id'] ?? null,
                    $validated['chapter_number'] ?? null,
                ),
                'to_drafts' => $this->moveToDrafts($ownedProject, $chapter),
            };

            return $this->chaptersForProject($ownedProject);
        });

        return response()->json(['chapters' => $chapters]);
    }

    private function reorder(Project $project, Chapter $chapter, ?int $beforeId): void
    {
        $groupQuery = Chapter::where('project_id', $project->id)
            ->where('is_in_manuscript', $chapter->is_in_manuscript);
        $chapter->parent_id === null
            ? $groupQuery->whereNull('parent_id')
            : $groupQuery->where('parent_id', $chapter->parent_id);

        $groupQuery = $chapter->is_in_manuscript
            ? $groupQuery->orderBy('chapter_number')->orderBy('sort_order')->orderBy('id')
            : $groupQuery->orderBy('sort_order')->orderBy('id');
        $group = $groupQuery->lockForUpdate()->get();
        $ordered = $group->all();
        $sourceIndex = $this->indexOf($ordered, $chapter->id);

        if ($sourceIndex === null) {
            throw ValidationException::withMessages([
                'chapter_id' => 'Rozdział nie należy do wskazanej grupy.',
            ]);
        }

        array_splice($ordered, $sourceIndex, 1);
        $destinationIndex = count($ordered);

        if ($beforeId !== null) {
            $beforeChapter = $project->chapters()
                ->whereKey($beforeId)
                ->lockForUpdate()
                ->firstOrFail();

            if ((bool) $beforeChapter->is_in_manuscript !== (bool) $chapter->is_in_manuscript
                || $beforeChapter->parent_id !== $chapter->parent_id) {
                throw ValidationException::withMessages([
                    'before_id' => 'Można zmieniać kolejność tylko w tej samej sekcji i u tego samego rodzica.',
                ]);
            }

            $destinationIndex = $this->indexOf($ordered, $beforeId);
            if ($destinationIndex === null) {
                throw ValidationException::withMessages([
                    'before_id' => 'Nie znaleziono miejsca docelowego w tej grupie.',
                ]);
            }
        }

        array_splice($ordered, $destinationIndex, 0, [$chapter]);

        if ($chapter->is_in_manuscript) {
            $numbers = $group->pluck('chapter_number')
                ->map(fn ($number): int => (int) $number)
                ->sort()
                ->values()
                ->all();

            if (count($numbers) !== count(array_filter($numbers, fn (int $number): bool => $number > 0))) {
                throw ValidationException::withMessages([
                    'chapter_id' => 'Każdy element rękopisu musi mieć dodatni numer.',
                ]);
            }

            foreach ($ordered as $index => $item) {
                $item->update([
                    'chapter_number' => -1_000_000_000 - $index,
                    'sort_order' => $index + 1,
                ]);
            }

            foreach ($ordered as $index => $item) {
                $item->update(['chapter_number' => $numbers[$index]]);
            }

            return;
        }

        foreach ($ordered as $index => $item) {
            $item->update(['sort_order' => $index + 1]);
        }
    }

    private function moveToManuscript(Project $project, Chapter $chapter, ?int $chapterNumber): void
    {
        $this->assertDraft($chapter);
        $this->assertPositiveNumber($chapterNumber);
        $this->assertNumberAvailable($project, null, $chapterNumber, $chapter->id);

        $children = $chapter->children()->lockForUpdate()->get();
        $childNumbers = $children->pluck('chapter_number')->map(fn ($number): int => (int) $number);

        if ($children->contains(fn (Chapter $child): bool => $child->is_in_manuscript)
            || $childNumbers->contains(fn (int $number): bool => $number < 1)
            || $childNumbers->unique()->count() !== $childNumbers->count()) {
            throw ValidationException::withMessages([
                'chapter_id' => 'Podrozdziały szkicu muszą mieć unikalne dodatnie numery lokalne.',
            ]);
        }

        $chapter->update([
            'parent_id' => null,
            'is_in_manuscript' => true,
            'chapter_number' => $chapterNumber,
            'sort_order' => $this->nextSortOrder($project, true, null),
        ]);

        if ($children->isNotEmpty()) {
            Chapter::whereIn('id', $children->modelKeys())->update(['is_in_manuscript' => true]);
        }
    }

    private function moveToSubchapter(
        Project $project,
        Chapter $chapter,
        ?int $parentId,
        ?int $chapterNumber,
    ): void {
        $this->assertDraft($chapter);
        $this->assertPositiveNumber($chapterNumber);

        if ($chapter->children()->lockForUpdate()->exists()) {
            throw ValidationException::withMessages([
                'chapter_id' => 'Szkic posiadający podrozdziały nie może stać się podrozdziałem.',
            ]);
        }

        if ($parentId === null) {
            throw ValidationException::withMessages(['parent_id' => 'Wybierz rozdział nadrzędny.']);
        }

        $parent = $project->chapters()->whereKey($parentId)->lockForUpdate()->firstOrFail();
        if (! $parent->is_in_manuscript || $parent->parent_id !== null) {
            throw ValidationException::withMessages([
                'parent_id' => 'Rodzicem może być tylko główny rozdział rękopisu.',
            ]);
        }

        $this->assertNumberAvailable($project, $parent->id, $chapterNumber, $chapter->id);
        $chapter->update([
            'parent_id' => $parent->id,
            'is_in_manuscript' => true,
            'chapter_number' => $chapterNumber,
            'sort_order' => $this->nextSortOrder($project, true, $parent->id),
        ]);
    }

    private function moveToDrafts(Project $project, Chapter $chapter): void
    {
        if (! $chapter->is_in_manuscript) {
            throw ValidationException::withMessages([
                'chapter_id' => 'Wybrany element znajduje się już w szkicach.',
            ]);
        }

        if ($chapter->parent_id !== null) {
            $chapter->update([
                'parent_id' => null,
                'is_in_manuscript' => false,
                'sort_order' => $this->nextSortOrder($project, false, null),
            ]);

            return;
        }

        $children = $chapter->children()->lockForUpdate()->get();
        $chapter->update([
            'is_in_manuscript' => false,
            'sort_order' => $this->nextSortOrder($project, false, null),
        ]);

        if ($children->isNotEmpty()) {
            Chapter::whereIn('id', $children->modelKeys())->update(['is_in_manuscript' => false]);
        }
    }

    private function assertDraft(Chapter $chapter): void
    {
        if ($chapter->is_in_manuscript) {
            throw ValidationException::withMessages([
                'chapter_id' => 'Tylko szkic można przenieść w to miejsce.',
            ]);
        }
    }

    private function assertPositiveNumber(?int $number): void
    {
        if ($number === null || $number < 1) {
            throw ValidationException::withMessages([
                'chapter_number' => 'Podaj dodatni numer całkowity.',
            ]);
        }
    }

    private function assertNumberAvailable(
        Project $project,
        ?int $parentId,
        int $number,
        int $ignoredChapterId,
    ): void {
        $query = $project->chapters()
            ->where('is_in_manuscript', true)
            ->where('chapter_number', $number)
            ->whereKeyNot($ignoredChapterId)
            ->lockForUpdate();
        $parentId === null ? $query->whereNull('parent_id') : $query->where('parent_id', $parentId);

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'chapter_number' => 'Ten numer jest już zajęty w wybranym miejscu.',
            ]);
        }
    }

    private function nextSortOrder(Project $project, bool $isInManuscript, ?int $parentId): int
    {
        $query = $project->chapters()->where('is_in_manuscript', $isInManuscript);
        $parentId === null ? $query->whereNull('parent_id') : $query->where('parent_id', $parentId);

        return ((int) $query->max('sort_order')) + 1;
    }

    /** @param array<int, Chapter> $chapters */
    private function indexOf(array $chapters, int $id): ?int
    {
        foreach ($chapters as $index => $chapter) {
            if ($chapter->id === $id) {
                return $index;
            }
        }

        return null;
    }

    private function chaptersForProject(Project $project): Collection
    {
        return $project->chapters()
            ->orderByDesc('is_in_manuscript')
            ->orderByRaw('CASE WHEN chapter_number IS NULL OR chapter_number <= 0 THEN 1 ELSE 0 END')
            ->orderBy('chapter_number')
            ->orderByRaw('CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END')
            ->orderBy('parent_id')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }
}
