<?php

namespace Tests\Feature;

use App\Models\AttributeDefinition;
use App\Models\AttributeValue;
use App\Models\Character;
use App\Models\Project;
use App\Models\User;
use App\Models\WorldElementCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttributeDefinitionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_use_any_definition_endpoint(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $category = $this->categoryFor($project);
        $definition = $this->characterDefinitionFor($project, 'Wzrost');
        $requests = [
            ['getJson', "/api/projects/{$project->id}/character-attribute-definitions", []],
            ['postJson', "/api/projects/{$project->id}/character-attribute-definitions", $this->payload()],
            ['getJson', "/api/world-element-categories/{$category->id}/attribute-definitions", []],
            ['postJson', "/api/world-element-categories/{$category->id}/attribute-definitions", $this->payload()],
            ['patchJson', "/api/attribute-definitions/{$definition->id}", ['name' => 'Nowa nazwa']],
            ['deleteJson', "/api/attribute-definitions/{$definition->id}", []],
            ['deleteJson', "/api/attribute-definitions/{$definition->id}?force=true", []],
        ];

        foreach ($requests as [$method, $uri, $payload]) {
            $this->{$method}($uri, $payload)->assertUnauthorized();
        }
    }

    public function test_other_user_gets_not_found_for_project_category_and_definition_endpoints(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $project = $this->projectFor($owner);
        $category = $this->categoryFor($project);
        $definition = $this->characterDefinitionFor($project, 'Wzrost');

        $this->actingAs($other)
            ->getJson("/api/projects/{$project->id}/character-attribute-definitions")
            ->assertNotFound();
        $this->actingAs($other)
            ->postJson("/api/projects/{$project->id}/character-attribute-definitions", $this->payload())
            ->assertNotFound();
        $this->actingAs($other)
            ->getJson("/api/world-element-categories/{$category->id}/attribute-definitions")
            ->assertNotFound();
        $this->actingAs($other)
            ->postJson("/api/world-element-categories/{$category->id}/attribute-definitions", $this->payload())
            ->assertNotFound();
        $this->actingAs($other)
            ->patchJson("/api/attribute-definitions/{$definition->id}", ['name' => 'Cudza'])
            ->assertNotFound();
        $this->actingAs($other)
            ->deleteJson("/api/attribute-definitions/{$definition->id}")
            ->assertNotFound();
        $this->actingAs($other)
            ->deleteJson("/api/attribute-definitions/{$definition->id}?force=true")
            ->assertNotFound();

        $this->assertDatabaseHas('attribute_definitions', ['id' => $definition->id]);
    }

    public function test_character_list_is_empty_or_contains_only_ordered_project_definitions(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Docelowy');
        $otherProject = $this->projectFor($user, 'Inny');
        $category = $this->categoryFor($project);

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/character-attribute-definitions")
            ->assertOk()
            ->assertExactJson([]);

        $later = $this->characterDefinitionFor($project, 'Późniejsza', sortOrder: 4);
        $first = $this->characterDefinitionFor($project, 'Pierwsza', sortOrder: 1);
        $second = $this->characterDefinitionFor($project, 'Druga', sortOrder: 1);
        $this->worldDefinitionFor($project, $category, 'Światowa');
        $outside = $this->characterDefinitionFor($otherProject, 'Obca');
        $character = $this->characterFor($project);
        AttributeValue::create([
            'attribute_definition_id' => $first->id,
            'character_id' => $character->id,
            'value_text' => 'Wartość',
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/character-attribute-definitions")
            ->assertOk()
            ->assertJsonCount(3)
            ->assertJsonPath('0.id', $first->id)
            ->assertJsonPath('1.id', $second->id)
            ->assertJsonPath('2.id', $later->id)
            ->assertJsonPath('0.values_count', 1)
            ->assertJsonMissing(['id' => $outside->id]);

        foreach ($response->json() as $item) {
            $this->assertArrayNotHasKey('normalized_name', $item);
            $this->assertArrayNotHasKey('scope_key', $item);
            $this->assertArrayHasKey('values_count', $item);
        }
    }

    public function test_world_category_list_contains_only_its_ordered_definitions(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project, 'Magia');
        $otherCategory = $this->categoryFor($project, 'Przedmioty');
        $later = $this->worldDefinitionFor($project, $category, 'Koszt', sortOrder: 3);
        $first = $this->worldDefinitionFor($project, $category, 'Źródło', sortOrder: 0);
        $other = $this->worldDefinitionFor($project, $otherCategory, 'Materiał');
        $this->characterDefinitionFor($project, 'Wzrost');

        $this->actingAs($user)
            ->getJson("/api/world-element-categories/{$category->id}/attribute-definitions")
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.id', $first->id)
            ->assertJsonPath('1.id', $later->id)
            ->assertJsonPath('0.values_count', 0)
            ->assertJsonMissing(['id' => $other->id]);
    }

    public function test_owner_can_create_character_and_world_definitions_with_derived_scope(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);

        $characterResponse = $this->actingAs($user)->postJson(
            "/api/projects/{$project->id}/character-attribute-definitions",
            ['name' => '  Wzrost  ', 'value_type' => 'number']
        )->assertCreated()
            ->assertJsonPath('name', 'Wzrost')
            ->assertJsonPath('project_id', $project->id)
            ->assertJsonPath('world_element_category_id', null)
            ->assertJsonPath('target_type', AttributeDefinition::TARGET_CHARACTER)
            ->assertJsonPath('value_type', AttributeDefinition::TYPE_NUMBER)
            ->assertJsonPath('sort_order', 0)
            ->assertJsonPath('values_count', 0)
            ->assertJsonMissingPath('scope_key')
            ->assertJsonMissingPath('normalized_name');

        $worldResponse = $this->actingAs($user)->postJson(
            "/api/world-element-categories/{$category->id}/attribute-definitions",
            ['name' => 'Źródło mocy', 'value_type' => 'text']
        )->assertCreated()
            ->assertJsonPath('project_id', $project->id)
            ->assertJsonPath('world_element_category_id', $category->id)
            ->assertJsonPath('target_type', AttributeDefinition::TARGET_WORLD_ELEMENT)
            ->assertJsonPath('values_count', 0);

        $this->assertSame('character', AttributeDefinition::find($characterResponse->json('id'))->scope_key);
        $this->assertSame(
            "world-category:{$category->id}",
            AttributeDefinition::find($worldResponse->json('id'))->scope_key
        );
    }

    public function test_creation_assigns_next_sort_order_in_each_scope(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);
        $this->characterDefinitionFor($project, 'Pierwsza', sortOrder: 2);
        $this->characterDefinitionFor($project, 'Druga', sortOrder: 7);
        $this->worldDefinitionFor($project, $category, 'Światowa', sortOrder: 20);

        $this->actingAs($user)->postJson(
            "/api/projects/{$project->id}/character-attribute-definitions",
            $this->payload('Kolejna')
        )->assertCreated()->assertJsonPath('sort_order', 8);

        $this->actingAs($user)->postJson(
            "/api/world-element-categories/{$category->id}/attribute-definitions",
            $this->payload('Kolejna światowa')
        )->assertCreated()->assertJsonPath('sort_order', 21);
    }

    public function test_creation_validates_name_type_and_normalized_uniqueness(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $endpoint = "/api/projects/{$project->id}/character-attribute-definitions";
        $this->characterDefinitionFor($project, 'Wzrost');

        $this->actingAs($user)->postJson($endpoint, ['value_type' => 'text'])
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->actingAs($user)->postJson($endpoint, ['name' => '   ', 'value_type' => 'text'])
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->actingAs($user)->postJson($endpoint, [
            'name' => str_repeat('a', 129),
            'value_type' => 'text',
        ])->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->actingAs($user)->postJson($endpoint, ['name' => 'Typ', 'value_type' => 'boolean'])
            ->assertUnprocessable()->assertJsonValidationErrors('value_type');
        $this->actingAs($user)->postJson($endpoint, ['name' => '  WZROST  ', 'value_type' => 'text'])
            ->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->assertDatabaseCount('attribute_definitions', 1);
    }

    public function test_same_name_is_allowed_in_other_scopes_and_projects(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Pierwszy');
        $otherProject = $this->projectFor($user, 'Drugi');
        $firstCategory = $this->categoryFor($project, 'Magia');
        $secondCategory = $this->categoryFor($project, 'Przedmioty');
        $this->characterDefinitionFor($project, 'Koszt');

        $this->actingAs($user)->postJson(
            "/api/world-element-categories/{$firstCategory->id}/attribute-definitions",
            $this->payload('KOSZT')
        )->assertCreated();
        $this->actingAs($user)->postJson(
            "/api/world-element-categories/{$secondCategory->id}/attribute-definitions",
            $this->payload(' koszt ')
        )->assertCreated();
        $this->actingAs($user)->postJson(
            "/api/projects/{$otherProject->id}/character-attribute-definitions",
            $this->payload('Koszt')
        )->assertCreated();

        $this->assertDatabaseCount('attribute_definitions', 4);
    }

    public function test_creation_ignores_all_system_fields_from_client(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Docelowy');
        $otherProject = $this->projectFor($user, 'Podsunięty');
        $category = $this->categoryFor($project);
        $otherCategory = $this->categoryFor($otherProject);

        $response = $this->actingAs($user)->postJson(
            "/api/projects/{$project->id}/character-attribute-definitions",
            [
                ...$this->payload('Bezpieczna'),
                'project_id' => $otherProject->id,
                'world_element_category_id' => $otherCategory->id,
                'target_type' => AttributeDefinition::TARGET_WORLD_ELEMENT,
                'scope_key' => "world-category:{$otherCategory->id}",
                'normalized_name' => 'podsunięta',
                'sort_order' => 999,
                'values_count' => 500,
            ]
        )->assertCreated()
            ->assertJsonPath('project_id', $project->id)
            ->assertJsonPath('world_element_category_id', null)
            ->assertJsonPath('target_type', AttributeDefinition::TARGET_CHARACTER)
            ->assertJsonPath('sort_order', 0)
            ->assertJsonPath('values_count', 0);

        $definition = AttributeDefinition::findOrFail($response->json('id'));
        $this->assertSame('character', $definition->scope_key);
        $this->assertSame('bezpieczna', $definition->normalized_name);
    }

    public function test_owner_can_rename_definition_and_keep_existing_values(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $definition = $this->characterDefinitionFor($project, 'Frakcja');
        $character = $this->characterFor($project);
        $value = AttributeValue::create([
            'attribute_definition_id' => $definition->id,
            'character_id' => $character->id,
            'value_text' => 'Północ',
        ]);

        $this->actingAs($user)->patchJson("/api/attribute-definitions/{$definition->id}", [
            'name' => '  Stronnictwo  ',
        ])->assertOk()
            ->assertJsonPath('name', 'Stronnictwo')
            ->assertJsonPath('values_count', 1);

        $this->assertDatabaseHas('attribute_values', [
            'id' => $value->id,
            'value_text' => 'Północ',
        ]);

        $this->actingAs($user)->patchJson("/api/attribute-definitions/{$definition->id}", [
            'name' => ' STRONNICTWO ',
        ])->assertOk()->assertJsonPath('name', 'STRONNICTWO');
    }

    public function test_update_rejects_duplicate_name_but_allows_type_change_without_values(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $first = $this->characterDefinitionFor($project, 'Wzrost');
        $second = $this->characterDefinitionFor($project, 'Frakcja');

        $this->actingAs($user)->patchJson("/api/attribute-definitions/{$second->id}", [
            'name' => ' WZROST ',
        ])->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->actingAs($user)->patchJson("/api/attribute-definitions/{$first->id}", [
            'value_type' => AttributeDefinition::TYPE_NUMBER,
        ])->assertOk()
            ->assertJsonPath('value_type', AttributeDefinition::TYPE_NUMBER)
            ->assertJsonPath('values_count', 0);
    }

    public function test_update_blocks_type_change_when_definition_has_values(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $definition = $this->characterDefinitionFor($project, 'Frakcja');
        $character = $this->characterFor($project);
        AttributeValue::create([
            'attribute_definition_id' => $definition->id,
            'character_id' => $character->id,
            'value_text' => 'Północ',
        ]);

        $this->actingAs($user)->patchJson("/api/attribute-definitions/{$definition->id}", [
            'name' => 'Nie powinno się zapisać',
            'value_type' => AttributeDefinition::TYPE_NUMBER,
        ])->assertConflict()
            ->assertExactJson([
                'message' => 'Nie można zmienić typu definicji posiadającej wartości.',
                'values_count' => 1,
            ]);

        $definition->refresh();
        $this->assertSame('Frakcja', $definition->name);
        $this->assertSame(AttributeDefinition::TYPE_TEXT, $definition->value_type);
    }

    public function test_update_cannot_move_definition_or_change_system_fields(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Docelowy');
        $otherProject = $this->projectFor($user, 'Inny');
        $category = $this->categoryFor($otherProject);
        $definition = $this->characterDefinitionFor($project, 'Frakcja', sortOrder: 3);

        $this->actingAs($user)->patchJson("/api/attribute-definitions/{$definition->id}", [
            'name' => 'Stronnictwo',
            'project_id' => $otherProject->id,
            'world_element_category_id' => $category->id,
            'target_type' => AttributeDefinition::TARGET_WORLD_ELEMENT,
            'scope_key' => "world-category:{$category->id}",
            'normalized_name' => 'podsunięta',
            'sort_order' => 999,
        ])->assertOk()->assertJsonPath('name', 'Stronnictwo');

        $definition->refresh();
        $this->assertSame($project->id, $definition->project_id);
        $this->assertNull($definition->world_element_category_id);
        $this->assertSame(AttributeDefinition::TARGET_CHARACTER, $definition->target_type);
        $this->assertSame('character', $definition->scope_key);
        $this->assertSame('stronnictwo', $definition->normalized_name);
        $this->assertSame(3, $definition->sort_order);
    }

    public function test_unused_definition_can_be_deleted(): void
    {
        $user = User::factory()->create();
        $definition = $this->characterDefinitionFor($this->projectFor($user), 'Wzrost');

        $this->actingAs($user)
            ->deleteJson("/api/attribute-definitions/{$definition->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('attribute_definitions', ['id' => $definition->id]);
    }

    public function test_used_definition_requires_force_and_force_deletes_only_its_values(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $character = $this->characterFor($project);
        $used = $this->characterDefinitionFor($project, 'Frakcja');
        $other = $this->characterDefinitionFor($project, 'Wzrost');
        $usedValue = AttributeValue::create([
            'attribute_definition_id' => $used->id,
            'character_id' => $character->id,
            'value_text' => 'Północ',
        ]);
        $otherValue = AttributeValue::create([
            'attribute_definition_id' => $other->id,
            'character_id' => $character->id,
            'value_text' => '180 cm',
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/attribute-definitions/{$used->id}")
            ->assertConflict()
            ->assertExactJson([
                'message' => 'Nie można usunąć definicji posiadającej wartości.',
                'values_count' => 1,
            ]);
        $this->assertDatabaseHas('attribute_definitions', ['id' => $used->id]);
        $this->assertDatabaseHas('attribute_values', ['id' => $usedValue->id]);

        $this->actingAs($user)
            ->deleteJson("/api/attribute-definitions/{$used->id}?force=true")
            ->assertNoContent();

        $this->assertDatabaseMissing('attribute_definitions', ['id' => $used->id]);
        $this->assertDatabaseMissing('attribute_values', ['id' => $usedValue->id]);
        $this->assertDatabaseHas('attribute_definitions', ['id' => $other->id]);
        $this->assertDatabaseHas('attribute_values', ['id' => $otherValue->id]);
    }

    public function test_delete_rejects_invalid_force_value(): void
    {
        $user = User::factory()->create();
        $definition = $this->characterDefinitionFor($this->projectFor($user), 'Wzrost');

        $this->actingAs($user)
            ->deleteJson("/api/attribute-definitions/{$definition->id}?force=perhaps")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('force');

        $this->assertDatabaseHas('attribute_definitions', ['id' => $definition->id]);
    }

    public function test_missing_definition_returns_not_found_for_update_and_delete(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patchJson('/api/attribute-definitions/999999', ['name' => 'Brak'])
            ->assertNotFound();
        $this->actingAs($user)
            ->deleteJson('/api/attribute-definitions/999999')
            ->assertNotFound();
    }

    /** @return array{name: string, value_type: string} */
    private function payload(
        string $name = 'Atrybut',
        string $valueType = AttributeDefinition::TYPE_TEXT,
    ): array {
        return ['name' => $name, 'value_type' => $valueType];
    }

    private function projectFor(User $user, string $name = 'Projekt'): Project
    {
        return Project::create(['user_id' => $user->id, 'name' => $name]);
    }

    private function categoryFor(Project $project, string $name = 'Magia'): WorldElementCategory
    {
        return WorldElementCategory::create(['project_id' => $project->id, 'name' => $name]);
    }

    private function characterFor(Project $project, string $name = 'Anna'): Character
    {
        return Character::create(['project_id' => $project->id, 'name' => $name]);
    }

    private function characterDefinitionFor(
        Project $project,
        string $name,
        string $valueType = AttributeDefinition::TYPE_TEXT,
        int $sortOrder = 0,
    ): AttributeDefinition {
        return AttributeDefinition::create([
            'project_id' => $project->id,
            'target_type' => AttributeDefinition::TARGET_CHARACTER,
            'name' => $name,
            'value_type' => $valueType,
            'sort_order' => $sortOrder,
        ]);
    }

    private function worldDefinitionFor(
        Project $project,
        WorldElementCategory $category,
        string $name,
        int $sortOrder = 0,
    ): AttributeDefinition {
        return AttributeDefinition::create([
            'project_id' => $project->id,
            'world_element_category_id' => $category->id,
            'target_type' => AttributeDefinition::TARGET_WORLD_ELEMENT,
            'name' => $name,
            'value_type' => AttributeDefinition::TYPE_TEXT,
            'sort_order' => $sortOrder,
        ]);
    }
}
