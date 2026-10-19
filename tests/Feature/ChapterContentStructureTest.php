<?php

namespace Tests\Feature;

use App\Models\Chapter;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChapterContentStructureTest extends TestCase
{
    use RefreshDatabase;

    public function test_legacy_payload_infers_manuscript_state_and_preserves_content_fields(): void
    {
        $user = User::factory()->create();
        $project = $this->project($user, 'Novel');

        $response = $this->actingAs($user)->postJson('/api/chapters', [
            'project_id' => $project->id,
            'chapter_number' => 1,
            'name' => 'Opening',
            'description' => 'Synopsis',
            'description_long' => '<p>Long content</p>',
            'notes' => 'Plain notes',
        ])->assertCreated()
            ->assertJsonPath('description', 'Synopsis')
            ->assertJsonPath('description_long', '<p>Long content</p>')
            ->assertJsonPath('notes', 'Plain notes')
            ->assertJsonPath('is_in_manuscript', true)
            ->assertJsonPath('sort_order', 1)
            ->assertJsonPath('parent_id', null);

        $this->assertDatabaseHas('chapters', [
            'id' => $response->json('id'),
            'description' => 'Synopsis',
            'description_long' => '<p>Long content</p>',
            'notes' => 'Plain notes',
            'is_in_manuscript' => true,
        ]);

        $this->actingAs($user)->putJson('/api/chapters/'.$response->json('id'), [
            'project_id' => $project->id,
            'chapter_number' => 1,
            'name' => 'Opening revised',
            'description' => 'Revised synopsis',
            'description_long' => '<p>Revised content</p>',
            'notes' => 'Revised notes',
        ])->assertOk()
            ->assertJsonPath('description', 'Revised synopsis')
            ->assertJsonPath('description_long', '<p>Revised content</p>')
            ->assertJsonPath('notes', 'Revised notes')
            ->assertJsonPath('is_in_manuscript', true);

        $this->actingAs($user)->postJson('/api/chapters', [
            'project_id' => $project->id,
            'name' => 'Loose draft',
        ])->assertCreated()
            ->assertJsonPath('is_in_manuscript', false)
            ->assertJsonPath('sort_order', 2);
    }

    public function test_owner_can_create_a_two_level_manuscript_structure(): void
    {
        $user = User::factory()->create();
        $project = $this->project($user, 'Novel');
        $parent = $this->chapter($project, 'Part one', true, null, 1);

        $response = $this->actingAs($user)->postJson('/api/chapters', [
            'project_id' => $project->id,
            'parent_id' => $parent->id,
            'is_in_manuscript' => true,
            'sort_order' => 1,
            'name' => 'Scene one',
        ])->assertCreated()
            ->assertJsonPath('parent_id', $parent->id)
            ->assertJsonPath('is_in_manuscript', true);

        $child = Chapter::findOrFail($response->json('id'));

        $this->assertTrue($child->parent->is($parent));
        $this->assertTrue($parent->children()->first()->is($child));
    }

    public function test_parent_must_belong_to_the_same_project_and_owner(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $project = $this->project($owner, 'Owned novel');
        $secondOwnedProject = $this->project($owner, 'Second novel');
        $otherProject = $this->project($otherUser, 'Other novel');
        $otherProjectParent = $this->chapter($secondOwnedProject, 'Other project parent', true);
        $otherOwnerParent = $this->chapter($otherProject, 'Other owner parent', true);

        foreach ([$otherProjectParent, $otherOwnerParent] as $parent) {
            $this->actingAs($owner)->postJson('/api/chapters', [
                'project_id' => $project->id,
                'parent_id' => $parent->id,
                'is_in_manuscript' => true,
                'name' => 'Invalid child '.$parent->id,
            ])->assertUnprocessable()
                ->assertJsonValidationErrors('parent_id');
        }
    }

    public function test_hierarchy_rejects_a_third_level_and_non_manuscript_members(): void
    {
        $user = User::factory()->create();
        $project = $this->project($user, 'Novel');
        $root = $this->chapter($project, 'Root', true);
        $child = $this->chapter($project, 'Child', true, $root->id);
        $draft = $this->chapter($project, 'Draft', false);

        $this->actingAs($user)->postJson('/api/chapters', [
            'project_id' => $project->id,
            'parent_id' => $child->id,
            'is_in_manuscript' => true,
            'name' => 'Third level',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('parent_id');

        $this->actingAs($user)->postJson('/api/chapters', [
            'project_id' => $project->id,
            'parent_id' => $draft->id,
            'is_in_manuscript' => true,
            'name' => 'Child of draft',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('parent_id');

        $this->actingAs($user)->postJson('/api/chapters', [
            'project_id' => $project->id,
            'parent_id' => $root->id,
            'is_in_manuscript' => false,
            'name' => 'Draft child',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('is_in_manuscript');
    }

    public function test_chapter_cannot_be_its_own_parent(): void
    {
        $user = User::factory()->create();
        $project = $this->project($user, 'Novel');
        $chapter = $this->chapter($project, 'Root', true);

        $this->actingAs($user)->putJson("/api/chapters/{$chapter->id}", [
            'project_id' => $project->id,
            'parent_id' => $chapter->id,
            'is_in_manuscript' => true,
            'name' => $chapter->name,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('parent_id');
    }

    public function test_parent_with_children_cannot_be_deleted_but_leaf_can(): void
    {
        $user = User::factory()->create();
        $project = $this->project($user, 'Novel');
        $parent = $this->chapter($project, 'Parent', true);
        $child = $this->chapter($project, 'Child', true, $parent->id);

        $this->actingAs($user)->deleteJson("/api/chapters/{$parent->id}")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Nie można usunąć rozdziału posiadającego podrozdziały.');
        $this->assertDatabaseHas('chapters', ['id' => $parent->id]);

        $this->actingAs($user)->deleteJson("/api/chapters/{$child->id}")
            ->assertOk();
        $this->assertDatabaseMissing('chapters', ['id' => $child->id]);
    }

    public function test_chapter_list_has_stable_structural_sorting(): void
    {
        $user = User::factory()->create();
        $project = $this->project($user, 'Novel');
        $later = $this->chapter($project, 'Later', true, null, 20);
        $earlier = $this->chapter($project, 'Earlier', true, null, 10);
        $draft = $this->chapter($project, 'Draft', false, null, 1);

        $this->actingAs($user)
            ->getJson("/api/chapters/{$project->id}/chapters")
            ->assertOk()
            ->assertJsonPath('0.id', $earlier->id)
            ->assertJsonPath('1.id', $later->id)
            ->assertJsonPath('2.id', $draft->id);
    }

    private function project(User $user, string $name): Project
    {
        return Project::create([
            'user_id' => $user->id,
            'name' => $name,
        ]);
    }

    private function chapter(
        Project $project,
        string $name,
        bool $isInManuscript,
        ?int $parentId = null,
        int $sortOrder = 1,
    ): Chapter {
        return Chapter::create([
            'project_id' => $project->id,
            'parent_id' => $parentId,
            'sort_order' => $sortOrder,
            'is_in_manuscript' => $isInManuscript,
            'name' => $name,
        ]);
    }
}
