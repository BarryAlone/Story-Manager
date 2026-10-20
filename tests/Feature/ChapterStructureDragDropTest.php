<?php

namespace Tests\Feature;

use App\Models\Chapter;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChapterStructureDragDropTest extends TestCase
{
    use RefreshDatabase;

    public function test_root_chapters_are_reordered_with_the_existing_ordered_number_set(): void
    {
        [$user, $project] = $this->fixture();
        $one = $this->chapter($project, 'One', true, 1, null, 1);
        $three = $this->chapter($project, 'Three', true, 3, null, 2);
        $seven = $this->chapter($project, 'Seven', true, 7, null, 3);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'reorder',
            'chapter_id' => $seven->id,
            'before_id' => $three->id,
        ])->assertOk();

        $this->assertSame(1, $one->refresh()->chapter_number);
        $this->assertSame(3, $seven->refresh()->chapter_number);
        $this->assertSame(7, $three->refresh()->chapter_number);
        $this->assertSame([1, 2, 3], [
            $one->sort_order,
            $seven->sort_order,
            $three->sort_order,
        ]);
    }

    public function test_subchapters_are_reordered_only_within_one_parent(): void
    {
        [$user, $project] = $this->fixture();
        $parent = $this->chapter($project, 'Parent', true, 3);
        $otherParent = $this->chapter($project, 'Other parent', true, 7);
        $one = $this->chapter($project, 'One', true, 1, $parent->id, 1);
        $two = $this->chapter($project, 'Two', true, 2, $parent->id, 2);
        $four = $this->chapter($project, 'Four', true, 4, $parent->id, 3);
        $other = $this->chapter($project, 'Other child', true, 1, $otherParent->id, 1);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'reorder',
            'chapter_id' => $four->id,
            'before_id' => $two->id,
        ])->assertOk();

        $this->assertSame(1, $one->refresh()->chapter_number);
        $this->assertSame(2, $four->refresh()->chapter_number);
        $this->assertSame(4, $two->refresh()->chapter_number);
        $this->assertSame(1, $other->refresh()->chapter_number);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'reorder',
            'chapter_id' => $four->id,
            'before_id' => $other->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('before_id');
    }

    public function test_drafts_are_reordered_by_sort_order_without_changing_their_numbers(): void
    {
        [$user, $project] = $this->fixture();
        $first = $this->chapter($project, 'First draft', false, 9, null, 2);
        $second = $this->chapter($project, 'Second draft', false, null, null, 5);
        $third = $this->chapter($project, 'Third draft', false, 4, null, 8);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'reorder',
            'chapter_id' => $third->id,
            'before_id' => $first->id,
        ])->assertOk();

        $this->assertSame([1, 2, 3], [
            $third->refresh()->sort_order,
            $first->refresh()->sort_order,
            $second->refresh()->sort_order,
        ]);
        $this->assertSame(4, $third->chapter_number);
        $this->assertSame(9, $first->chapter_number);
        $this->assertNull($second->chapter_number);
    }

    public function test_draft_can_move_to_manuscript_as_root_or_subchapter(): void
    {
        [$user, $project] = $this->fixture();
        $parent = $this->chapter($project, 'Parent', true, 3);
        $rootDraft = $this->chapter($project, 'Root draft', false, null, null, 1);
        $childDraft = $this->chapter($project, 'Child draft', false, null, null, 2);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_manuscript',
            'chapter_id' => $rootDraft->id,
            'chapter_number' => 7,
        ])->assertOk();

        $this->assertTrue($rootDraft->refresh()->is_in_manuscript);
        $this->assertNull($rootDraft->parent_id);
        $this->assertSame(7, $rootDraft->chapter_number);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $childDraft->id,
            'parent_id' => $parent->id,
            'chapter_number' => 2,
        ])->assertOk();

        $this->assertTrue($childDraft->refresh()->is_in_manuscript);
        $this->assertSame($parent->id, $childDraft->parent_id);
        $this->assertSame(2, $childDraft->chapter_number);
    }

    public function test_root_with_children_moves_to_drafts_without_losing_structure_or_content(): void
    {
        [$user, $project] = $this->fixture();
        $root = $this->chapter($project, 'Root', true, 3, null, 1, [
            'description' => 'Synopsis',
            'description_long' => '<p>Content</p>',
            'notes' => 'Notes',
            'chapter_image' => 'chapters/image.jpg',
            'timeline_point_start' => 10,
            'timeline_point_end' => 20,
            'display_label' => 'Day one',
        ]);
        $firstChild = $this->chapter($project, 'First child', true, 1, $root->id, 4);
        $secondChild = $this->chapter($project, 'Second child', true, 4, $root->id, 8);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_drafts',
            'chapter_id' => $root->id,
        ])->assertOk();

        $root->refresh();
        $firstChild->refresh();
        $secondChild->refresh();

        $this->assertFalse($root->is_in_manuscript);
        $this->assertFalse($firstChild->is_in_manuscript);
        $this->assertFalse($secondChild->is_in_manuscript);
        $this->assertSame($root->id, $firstChild->parent_id);
        $this->assertSame($root->id, $secondChild->parent_id);
        $this->assertSame([1, 4], [$firstChild->chapter_number, $secondChild->chapter_number]);
        $this->assertSame([4, 8], [$firstChild->sort_order, $secondChild->sort_order]);
        $this->assertSame('Synopsis', $root->description);
        $this->assertSame('<p>Content</p>', $root->description_long);
        $this->assertSame('Notes', $root->notes);
        $this->assertSame('chapters/image.jpg', $root->chapter_image);
        $this->assertSame(10, $root->timeline_point_start);
        $this->assertSame(20, $root->timeline_point_end);
        $this->assertSame('Day one', $root->display_label);
    }

    public function test_single_subchapter_moves_to_drafts_as_a_detached_item(): void
    {
        [$user, $project] = $this->fixture();
        $parent = $this->chapter($project, 'Parent', true, 3);
        $child = $this->chapter($project, 'Child', true, 2, $parent->id, 1);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_drafts',
            'chapter_id' => $child->id,
        ])->assertOk();

        $child->refresh();
        $this->assertFalse($child->is_in_manuscript);
        $this->assertNull($child->parent_id);
        $this->assertSame(2, $child->chapter_number);
    }

    public function test_number_conflict_and_invalid_third_level_leave_structure_unchanged(): void
    {
        [$user, $project] = $this->fixture();
        $parent = $this->chapter($project, 'Parent', true, 3);
        $existingChild = $this->chapter($project, 'Existing child', true, 2, $parent->id, 1);
        $draft = $this->chapter($project, 'Draft', false, 9, null, 1);
        $draftWithChild = $this->chapter($project, 'Draft tree', false, 7, null, 2);
        $draftChild = $this->chapter($project, 'Draft child', false, 1, $draftWithChild->id, 1);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $draft->id,
            'parent_id' => $parent->id,
            'chapter_number' => 2,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('chapter_number');

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $draftWithChild->id,
            'parent_id' => $parent->id,
            'chapter_number' => 4,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('chapter_id');

        $this->assertFalse($draft->refresh()->is_in_manuscript);
        $this->assertNull($draft->parent_id);
        $this->assertSame(9, $draft->chapter_number);
        $this->assertFalse($draftWithChild->refresh()->is_in_manuscript);
        $this->assertSame($draftWithChild->id, $draftChild->refresh()->parent_id);
        $this->assertSame(2, $existingChild->refresh()->chapter_number);
    }

    public function test_chapters_from_another_project_or_account_are_rejected(): void
    {
        [$owner, $project] = $this->fixture();
        $otherProject = Project::create(['user_id' => $owner->id, 'name' => 'Other project']);
        $foreignChapter = $this->chapter($otherProject, 'Foreign', true, 1);
        $otherUser = User::factory()->create();

        $this->actingAs($owner)->patchJson($this->endpoint($project), [
            'action' => 'to_drafts',
            'chapter_id' => $foreignChapter->id,
        ])->assertNotFound();

        $this->actingAs($otherUser)->patchJson($this->endpoint($project), [
            'action' => 'to_drafts',
            'chapter_id' => $foreignChapter->id,
        ])->assertNotFound();
    }

    /** @return array{User, Project} */
    private function fixture(): array
    {
        $user = User::factory()->create();
        $project = Project::create(['user_id' => $user->id, 'name' => 'Novel']);

        return [$user, $project];
    }

    /** @param array<string, mixed> $attributes */
    private function chapter(
        Project $project,
        string $name,
        bool $isInManuscript,
        ?int $number,
        ?int $parentId = null,
        int $sortOrder = 1,
        array $attributes = [],
    ): Chapter {
        return Chapter::create([
            'project_id' => $project->id,
            'parent_id' => $parentId,
            'chapter_number' => $number,
            'sort_order' => $sortOrder,
            'is_in_manuscript' => $isInManuscript,
            'name' => $name,
            ...$attributes,
        ]);
    }

    private function endpoint(Project $project): string
    {
        return "/api/projects/{$project->id}/chapter-structure";
    }
}
