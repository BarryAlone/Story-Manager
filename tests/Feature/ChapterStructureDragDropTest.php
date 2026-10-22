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

    public function test_subchapter_moves_to_another_parent_and_preserves_content_and_metadata(): void
    {
        [$user, $project] = $this->fixture();
        $oldParent = $this->chapter($project, 'Old parent', true, 7);
        $newParent = $this->chapter($project, 'New parent', true, 5);
        $this->chapter($project, 'Existing child', true, 1, $newParent->id, 1);
        $child = $this->chapter($project, 'Moved child', true, 3, $oldParent->id, 4, [
            'description' => 'Synopsis',
            'description_long' => '<p>Content</p>',
            'notes' => 'Notes',
            'chapter_image' => 'chapters/image.jpg',
            'timeline_point_start' => 10,
            'timeline_point_end' => 20,
            'display_label' => 'Day one',
        ]);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $child->id,
            'parent_id' => $newParent->id,
            'chapter_number' => 3,
        ])->assertOk();

        $child->refresh();
        $this->assertSame($newParent->id, $child->parent_id);
        $this->assertSame(3, $child->chapter_number);
        $this->assertSame(2, $child->sort_order);
        $this->assertSame('Synopsis', $child->description);
        $this->assertSame('<p>Content</p>', $child->description_long);
        $this->assertSame('Notes', $child->notes);
        $this->assertSame('chapters/image.jpg', $child->chapter_image);
        $this->assertSame(10, $child->timeline_point_start);
        $this->assertSame(20, $child->timeline_point_end);
        $this->assertSame('Day one', $child->display_label);
    }

    public function test_root_without_children_becomes_a_subchapter_and_preserves_content_and_metadata(): void
    {
        [$user, $project] = $this->fixture();
        $parent = $this->chapter($project, 'Target parent', true, 5, null, 1);
        $root = $this->chapter($project, 'Moved root', true, 7, null, 4, [
            'description' => 'Synopsis',
            'description_long' => '<p>Content</p>',
            'notes' => 'Notes',
            'chapter_image' => 'chapters/image.jpg',
            'timeline_point_start' => 10,
            'timeline_point_end' => 20,
            'display_label' => 'Day one',
        ]);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $root->id,
            'parent_id' => $parent->id,
            'chapter_number' => 3,
        ])->assertOk();

        $root->refresh();
        $this->assertSame($parent->id, $root->parent_id);
        $this->assertTrue($root->is_in_manuscript);
        $this->assertSame(3, $root->chapter_number);
        $this->assertSame(1, $root->sort_order);
        $this->assertSame(1, $parent->refresh()->sort_order);
        $this->assertSame('Synopsis', $root->description);
        $this->assertSame('<p>Content</p>', $root->description_long);
        $this->assertSame('Notes', $root->notes);
        $this->assertSame('chapters/image.jpg', $root->chapter_image);
        $this->assertSame(10, $root->timeline_point_start);
        $this->assertSame(20, $root->timeline_point_end);
        $this->assertSame('Day one', $root->display_label);
    }

    public function test_root_to_subchapter_number_conflict_rolls_back_all_changes(): void
    {
        [$user, $project] = $this->fixture();
        $parent = $this->chapter($project, 'Target parent', true, 5, null, 1);
        $this->chapter($project, 'Occupied child', true, 3, $parent->id, 1);
        $root = $this->chapter($project, 'Moved root', true, 7, null, 4, [
            'description' => 'Synopsis',
            'description_long' => '<p>Unchanged</p>',
            'notes' => 'Notes',
            'display_label' => 'Day one',
        ]);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $root->id,
            'parent_id' => $parent->id,
            'chapter_number' => 3,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('chapter_number');

        $root->refresh();
        $this->assertNull($root->parent_id);
        $this->assertTrue($root->is_in_manuscript);
        $this->assertSame(7, $root->chapter_number);
        $this->assertSame(4, $root->sort_order);
        $this->assertSame('Synopsis', $root->description);
        $this->assertSame('<p>Unchanged</p>', $root->description_long);
        $this->assertSame('Notes', $root->notes);
        $this->assertSame('Day one', $root->display_label);
    }

    public function test_subchapter_can_be_promoted_to_a_root_chapter(): void
    {
        [$user, $project] = $this->fixture();
        $parent = $this->chapter($project, 'Parent', true, 7);
        $child = $this->chapter($project, 'Child', true, 3, $parent->id, 4, [
            'description_long' => '<p>Keep me</p>',
            'notes' => 'Keep notes',
        ]);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_manuscript',
            'chapter_id' => $child->id,
            'chapter_number' => 5,
        ])->assertOk();

        $child->refresh();
        $this->assertNull($child->parent_id);
        $this->assertTrue($child->is_in_manuscript);
        $this->assertSame(5, $child->chapter_number);
        $this->assertSame('<p>Keep me</p>', $child->description_long);
        $this->assertSame('Keep notes', $child->notes);
    }

    public function test_number_conflicts_for_reparenting_and_promotion_roll_back_the_move(): void
    {
        [$user, $project] = $this->fixture();
        $oldParent = $this->chapter($project, 'Old parent', true, 7);
        $newParent = $this->chapter($project, 'New parent', true, 5);
        $this->chapter($project, 'Occupied child number', true, 3, $newParent->id);
        $this->chapter($project, 'Occupied root number', true, 9);
        $child = $this->chapter($project, 'Child', true, 3, $oldParent->id, 4, [
            'description_long' => '<p>Unchanged</p>',
        ]);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $child->id,
            'parent_id' => $newParent->id,
            'chapter_number' => 3,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('chapter_number');

        $child->refresh();
        $this->assertSame($oldParent->id, $child->parent_id);
        $this->assertSame(3, $child->chapter_number);
        $this->assertSame(4, $child->sort_order);
        $this->assertSame('<p>Unchanged</p>', $child->description_long);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_manuscript',
            'chapter_id' => $child->id,
            'chapter_number' => 9,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('chapter_number');

        $child->refresh();
        $this->assertSame($oldParent->id, $child->parent_id);
        $this->assertSame(3, $child->chapter_number);
        $this->assertSame(4, $child->sort_order);
        $this->assertSame('<p>Unchanged</p>', $child->description_long);
    }

    public function test_third_level_cycles_roots_with_children_and_self_parenting_are_rejected(): void
    {
        [$user, $project] = $this->fixture();
        $root = $this->chapter($project, 'Root', true, 3);
        $otherRoot = $this->chapter($project, 'Other root', true, 7);
        $selfTarget = $this->chapter($project, 'Self target', true, 9);
        $child = $this->chapter($project, 'Child', true, 1, $root->id);
        $draftTree = $this->chapter($project, 'Draft tree', false, 4);
        $draftChild = $this->chapter($project, 'Draft child', false, 1, $draftTree->id);

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $child->id,
            'parent_id' => $child->id,
            'chapter_number' => 2,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('parent_id');

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $child->id,
            'parent_id' => $draftChild->id,
            'chapter_number' => 2,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('parent_id');

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $root->id,
            'parent_id' => $otherRoot->id,
            'chapter_number' => 2,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('chapter_id');

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $root->id,
            'parent_id' => $child->id,
            'chapter_number' => 2,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('chapter_id');

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $selfTarget->id,
            'parent_id' => $selfTarget->id,
            'chapter_number' => 2,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('parent_id');

        $this->actingAs($user)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $draftTree->id,
            'parent_id' => $draftChild->id,
            'chapter_number' => 2,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('chapter_id');

        $this->assertSame($root->id, $child->refresh()->parent_id);
        $this->assertNull($selfTarget->refresh()->parent_id);
        $this->assertSame($draftTree->id, $draftChild->refresh()->parent_id);
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
        $ownedParent = $this->chapter($project, 'Owned parent', true, 3);
        $ownedChild = $this->chapter($project, 'Owned child', true, 1, $ownedParent->id);
        $ownedRoot = $this->chapter($project, 'Owned root', true, 7);
        $otherUser = User::factory()->create();

        $this->actingAs($owner)->patchJson($this->endpoint($project), [
            'action' => 'to_drafts',
            'chapter_id' => $foreignChapter->id,
        ])->assertNotFound();

        $this->actingAs($otherUser)->patchJson($this->endpoint($project), [
            'action' => 'to_drafts',
            'chapter_id' => $foreignChapter->id,
        ])->assertNotFound();

        $this->actingAs($owner)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $ownedChild->id,
            'parent_id' => $foreignChapter->id,
            'chapter_number' => 2,
        ])->assertNotFound();

        $this->actingAs($owner)->patchJson($this->endpoint($project), [
            'action' => 'to_subchapter',
            'chapter_id' => $ownedRoot->id,
            'parent_id' => $foreignChapter->id,
            'chapter_number' => 2,
        ])->assertNotFound();

        $this->assertSame($ownedParent->id, $ownedChild->refresh()->parent_id);
        $this->assertNull($ownedRoot->refresh()->parent_id);
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
