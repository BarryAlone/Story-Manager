<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use App\Models\WorldElement;
use App\Models\WorldElementCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorldElementCategoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_use_category_endpoints(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);

        $this->getJson("/api/projects/{$project->id}/world-element-categories")->assertUnauthorized();
        $this->postJson("/api/projects/{$project->id}/world-element-categories", ['name' => 'Magia'])
            ->assertUnauthorized();
        $this->patchJson("/api/world-element-categories/{$category->id}", ['name' => 'Nowa nazwa'])
            ->assertUnauthorized();
        $this->deleteJson("/api/world-element-categories/{$category->id}")->assertUnauthorized();
    }

    public function test_owner_gets_empty_list_without_automatic_categories(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/world-element-categories")
            ->assertOk()
            ->assertExactJson([]);

        $this->assertDatabaseCount('world_element_categories', 0);
    }

    public function test_list_is_project_scoped_sorted_and_contains_counts_without_normalized_name(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Własny projekt');
        $otherProject = $this->projectFor($user, 'Inny projekt');
        $items = $this->categoryFor($project, 'Przedmioty');
        $magic = $this->categoryFor($project, 'magia');
        $locations = $this->categoryFor($project, 'Lokalizacje');
        $otherCategory = $this->categoryFor($otherProject, 'Bestiariusz');
        WorldElement::create([
            'world_element_category_id' => $items->id,
            'name' => 'Pierścień',
        ]);
        WorldElement::create([
            'world_element_category_id' => $items->id,
            'name' => 'Miecz',
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/world-element-categories")
            ->assertOk()
            ->assertJsonCount(3)
            ->assertJsonPath('0.id', $locations->id)
            ->assertJsonPath('1.id', $magic->id)
            ->assertJsonPath('2.id', $items->id)
            ->assertJsonPath('2.items_count', 2)
            ->assertJsonMissing(['id' => $otherCategory->id]);

        foreach ($response->json() as $category) {
            $this->assertArrayNotHasKey('normalized_name', $category);
            $this->assertArrayHasKey('items_count', $category);
        }
    }

    public function test_owner_can_create_trimmed_category_and_system_fields_are_ignored(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Projekt docelowy');
        $otherProject = $this->projectFor($user, 'Projekt podsunięty');

        $response = $this->actingAs($user)->postJson(
            "/api/projects/{$project->id}/world-element-categories",
            [
                'name' => '  Lokalizacje  ',
                'project_id' => $otherProject->id,
                'normalized_name' => 'podsunięta-wartość',
                'items_count' => 999,
                'user_id' => 999,
            ]
        );

        $response
            ->assertCreated()
            ->assertJsonPath('name', 'Lokalizacje')
            ->assertJsonPath('project_id', $project->id)
            ->assertJsonPath('items_count', 0)
            ->assertJsonMissingPath('normalized_name');
        $this->assertDatabaseHas('world_element_categories', [
            'id' => $response->json('id'),
            'project_id' => $project->id,
            'name' => 'Lokalizacje',
            'normalized_name' => 'lokalizacje',
        ]);
    }

    public function test_create_validates_required_length_and_normalized_uniqueness(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $this->categoryFor($project, 'Magia');
        $endpoint = "/api/projects/{$project->id}/world-element-categories";

        $this->actingAs($user)->postJson($endpoint, [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
        $this->actingAs($user)->postJson($endpoint, ['name' => '   '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
        $this->actingAs($user)->postJson($endpoint, ['name' => str_repeat('a', 129)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
        $this->actingAs($user)->postJson($endpoint, ['name' => 'magia'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
        $this->actingAs($user)->postJson($endpoint, ['name' => '  MAGIA  '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->assertDatabaseCount('world_element_categories', 1);
    }

    public function test_same_normalized_name_is_allowed_in_another_project(): void
    {
        $user = User::factory()->create();
        $firstProject = $this->projectFor($user, 'Pierwszy projekt');
        $secondProject = $this->projectFor($user, 'Drugi projekt');
        $this->categoryFor($firstProject, 'Magia');

        $this->actingAs($user)->postJson(
            "/api/projects/{$secondProject->id}/world-element-categories",
            ['name' => ' MAGIA ']
        )->assertCreated()->assertJsonPath('name', 'MAGIA');
    }

    public function test_owner_can_update_name_keep_current_name_and_cannot_move_category(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Projekt kategorii');
        $otherProject = $this->projectFor($user, 'Inny projekt');
        $category = $this->categoryFor($project, 'Magia');
        WorldElement::create([
            'world_element_category_id' => $category->id,
            'name' => 'Magia ognia',
        ]);

        $this->actingAs($user)->patchJson("/api/world-element-categories/{$category->id}", [
            'name' => '  Systemy magii  ',
            'project_id' => $otherProject->id,
            'normalized_name' => 'niepoprawna-wartość',
            'items_count' => 500,
        ])
            ->assertOk()
            ->assertJsonPath('name', 'Systemy magii')
            ->assertJsonPath('project_id', $project->id)
            ->assertJsonPath('items_count', 1)
            ->assertJsonMissingPath('normalized_name');

        $this->actingAs($user)->patchJson(
            "/api/world-element-categories/{$category->id}",
            ['name' => ' SYSTEMY MAGII ']
        )->assertOk()->assertJsonPath('name', 'SYSTEMY MAGII');

        $category->refresh();
        $this->assertSame($project->id, $category->project_id);
        $this->assertSame('systemy magii', $category->getRawOriginal('normalized_name'));
    }

    public function test_update_rejects_name_used_by_another_category(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project, 'Magia');
        $this->categoryFor($project, 'Lokalizacje');

        $this->actingAs($user)->patchJson(
            "/api/world-element-categories/{$category->id}",
            ['name' => ' LOKALIZACJE ']
        )->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->assertSame('Magia', $category->fresh()->name);
    }

    public function test_owner_can_delete_empty_category_and_missing_category_returns_not_found(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);

        $this->actingAs($user)
            ->deleteJson("/api/world-element-categories/{$category->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('world_element_categories', ['id' => $category->id]);
        $this->actingAs($user)
            ->deleteJson('/api/world-element-categories/999999')
            ->assertNotFound();
        $this->actingAs($user)
            ->patchJson('/api/world-element-categories/999999', ['name' => 'Brak'])
            ->assertNotFound();
    }

    public function test_non_empty_category_returns_conflict_and_preserves_data(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);
        $element = WorldElement::create([
            'world_element_category_id' => $category->id,
            'name' => 'Poznań',
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/world-element-categories/{$category->id}")
            ->assertConflict()
            ->assertExactJson([
                'message' => 'Nie można usunąć kategorii zawierającej elementy.',
            ]);

        $this->assertDatabaseHas('world_element_categories', ['id' => $category->id]);
        $this->assertDatabaseHas('world_elements', [
            'id' => $element->id,
            'world_element_category_id' => $category->id,
        ]);
    }

    public function test_other_user_gets_not_found_for_project_and_category_operations(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $project = $this->projectFor($owner);
        $category = $this->categoryFor($project);

        $this->actingAs($otherUser)
            ->getJson("/api/projects/{$project->id}/world-element-categories")
            ->assertNotFound();
        $this->actingAs($otherUser)
            ->postJson("/api/projects/{$project->id}/world-element-categories", ['name' => 'Cudza'])
            ->assertNotFound();
        $this->actingAs($otherUser)
            ->patchJson("/api/world-element-categories/{$category->id}", ['name' => 'Cudza'])
            ->assertNotFound();
        $this->actingAs($otherUser)
            ->deleteJson("/api/world-element-categories/{$category->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('world_element_categories', [
            'id' => $category->id,
            'name' => $category->name,
        ]);
    }

    private function projectFor(User $user, string $name = 'Projekt świata'): Project
    {
        return Project::create([
            'user_id' => $user->id,
            'name' => $name,
        ]);
    }

    private function categoryFor(Project $project, string $name = 'Lokalizacje'): WorldElementCategory
    {
        return WorldElementCategory::create([
            'project_id' => $project->id,
            'name' => $name,
        ]);
    }
}
