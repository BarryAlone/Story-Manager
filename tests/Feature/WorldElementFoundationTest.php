<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use App\Models\WorldElement;
use App\Models\WorldElementCategory;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class WorldElementFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_schema_and_model_relations_form_the_world_element_hierarchy(): void
    {
        $project = $this->projectFor(User::factory()->create(), 'Świat opowieści');
        $category = WorldElementCategory::create([
            'project_id' => $project->id,
            'name' => 'Lokalizacje',
        ]);
        $element = WorldElement::create([
            'world_element_category_id' => $category->id,
            'name' => 'Las Zguby',
            'description' => 'Las otaczający północne rubieże.',
            'image_path' => 'world-elements/forest.webp',
        ]);

        $this->assertTrue(Schema::hasColumns('world_element_categories', [
            'id',
            'project_id',
            'name',
            'normalized_name',
            'created_at',
            'updated_at',
        ]));
        $this->assertTrue(Schema::hasColumns('world_elements', [
            'id',
            'world_element_category_id',
            'name',
            'description',
            'image_path',
            'created_at',
            'updated_at',
        ]));
        $this->assertTrue($project->worldElementCategories->contains($category));
        $this->assertTrue($category->project->is($project));
        $this->assertTrue($category->worldElements->contains($element));
        $this->assertTrue($element->worldElementCategory->is($category));
        $this->assertTrue($element->worldElementCategory->project->is($project));
    }

    public function test_category_name_is_trimmed_normalized_and_hidden_from_serialization(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $category = WorldElementCategory::create([
            'project_id' => $project->id,
            'name' => '  MAGIA  ',
        ]);

        $this->assertSame('MAGIA', $category->name);
        $this->assertSame('magia', $category->getRawOriginal('normalized_name'));
        $this->assertArrayNotHasKey('normalized_name', $category->toArray());

        $category->update(['name' => '  LokALIzacje  ']);
        $category->refresh();

        $this->assertSame('LokALIzacje', $category->name);
        $this->assertSame('lokalizacje', $category->getRawOriginal('normalized_name'));
    }

    public function test_category_names_are_unique_case_insensitively_within_a_project(): void
    {
        $project = $this->projectFor(User::factory()->create());
        WorldElementCategory::create([
            'project_id' => $project->id,
            'name' => 'Magia',
        ]);

        $this->expectException(QueryException::class);

        WorldElementCategory::create([
            'project_id' => $project->id,
            'name' => '  magia  ',
        ]);
    }

    public function test_same_category_name_can_be_used_in_different_projects(): void
    {
        $user = User::factory()->create();
        $firstProject = $this->projectFor($user, 'Pierwszy projekt');
        $secondProject = $this->projectFor($user, 'Drugi projekt');

        $first = WorldElementCategory::create([
            'project_id' => $firstProject->id,
            'name' => 'Przedmioty',
        ]);
        $second = WorldElementCategory::create([
            'project_id' => $secondProject->id,
            'name' => ' PRZEDMIOTY ',
        ]);

        $this->assertNotSame($first->project_id, $second->project_id);
        $this->assertSame('przedmioty', $first->getRawOriginal('normalized_name'));
        $this->assertSame('przedmioty', $second->getRawOriginal('normalized_name'));
    }

    public function test_element_names_can_repeat_in_the_same_category(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $category = $this->categoryFor($project);

        $first = WorldElement::create([
            'world_element_category_id' => $category->id,
            'name' => 'Pierścień',
        ]);
        $second = WorldElement::create([
            'world_element_category_id' => $category->id,
            'name' => 'Pierścień',
        ]);

        $this->assertNotSame($first->id, $second->id);
        $this->assertSame(2, $category->worldElements()->where('name', 'Pierścień')->count());
    }

    public function test_deleting_project_cascades_to_categories_and_elements(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $category = $this->categoryFor($project);
        $element = WorldElement::create([
            'world_element_category_id' => $category->id,
            'name' => 'Wieża',
        ]);

        $project->delete();

        $this->assertDatabaseMissing('world_element_categories', ['id' => $category->id]);
        $this->assertDatabaseMissing('world_elements', ['id' => $element->id]);
    }

    public function test_deleting_category_cascades_to_its_elements(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $category = $this->categoryFor($project);
        $element = WorldElement::create([
            'world_element_category_id' => $category->id,
            'name' => 'Amulet',
        ]);

        $category->delete();

        $this->assertDatabaseMissing('world_element_categories', ['id' => $category->id]);
        $this->assertDatabaseMissing('world_elements', ['id' => $element->id]);
    }

    public function test_category_policy_allows_owner_and_hides_resource_from_other_user(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $category = $this->categoryFor($this->projectFor($owner));

        foreach (['view', 'update', 'delete'] as $ability) {
            $this->assertTrue(Gate::forUser($owner)->allows($ability, $category));

            $response = Gate::forUser($otherUser)->inspect($ability, $category);
            $this->assertTrue($response->denied());
            $this->assertSame(404, $response->status());
        }
    }

    public function test_element_policy_allows_owner_and_hides_resource_from_other_user(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $category = $this->categoryFor($this->projectFor($owner));
        $element = WorldElement::create([
            'world_element_category_id' => $category->id,
            'name' => 'Kryształ',
        ]);

        foreach (['view', 'update', 'delete'] as $ability) {
            $this->assertTrue(Gate::forUser($owner)->allows($ability, $element));

            $response = Gate::forUser($otherUser)->inspect($ability, $element);
            $this->assertTrue($response->denied());
            $this->assertSame(404, $response->status());
        }
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
