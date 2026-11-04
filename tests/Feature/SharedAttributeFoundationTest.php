<?php

namespace Tests\Feature;

use App\Models\AttributeDefinition;
use App\Models\AttributeValue;
use App\Models\Character;
use App\Models\Project;
use App\Models\User;
use App\Models\WorldElement;
use App\Models\WorldElementCategory;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use Tests\TestCase;

class SharedAttributeFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_schema_and_relations_form_the_shared_attribute_foundation(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $category = $this->categoryFor($project);
        $characterDefinition = $this->characterDefinitionFor($project, 'Wzrost', sortOrder: 2);
        $earlierDefinition = $this->characterDefinitionFor($project, 'Frakcja', sortOrder: 1);
        $worldDefinition = $this->worldDefinitionFor($project, $category, 'Źródło mocy');
        $character = $this->characterFor($project);
        $element = $this->worldElementFor($category);
        $characterValue = AttributeValue::create([
            'attribute_definition_id' => $characterDefinition->id,
            'character_id' => $character->id,
            'value_number' => 180,
        ]);
        $worldValue = AttributeValue::create([
            'attribute_definition_id' => $worldDefinition->id,
            'world_element_id' => $element->id,
            'value_text' => 'Żywioł ognia',
        ]);

        $this->assertTrue(Schema::hasColumns('attribute_definitions', [
            'id',
            'project_id',
            'world_element_category_id',
            'target_type',
            'scope_key',
            'name',
            'normalized_name',
            'value_type',
            'sort_order',
            'created_at',
            'updated_at',
        ]));
        $this->assertTrue(Schema::hasColumns('attribute_values', [
            'id',
            'attribute_definition_id',
            'character_id',
            'world_element_id',
            'value_text',
            'value_number',
            'created_at',
            'updated_at',
        ]));

        $this->assertTrue($characterDefinition->project->is($project));
        $this->assertTrue($worldDefinition->worldElementCategory->is($category));
        $this->assertTrue($project->attributeDefinitions->contains($worldDefinition));
        $this->assertSame(
            [$earlierDefinition->id, $characterDefinition->id],
            $project->characterAttributeDefinitions->pluck('id')->all()
        );
        $this->assertTrue($category->attributeDefinitions->contains($worldDefinition));
        $this->assertTrue($character->attributeValues->contains($characterValue));
        $this->assertTrue($element->attributeValues->contains($worldValue));
        $this->assertTrue($characterValue->definition->is($characterDefinition));
        $this->assertTrue($characterValue->character->is($character));
        $this->assertTrue($worldValue->worldElement->is($element));
    }

    public function test_definition_normalizes_name_builds_scope_and_hides_technical_fields(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $category = $this->categoryFor($project);
        $characterDefinition = $this->characterDefinitionFor($project, '  WZROST  ');
        $worldDefinition = $this->worldDefinitionFor($project, $category, '  ŹRÓDŁO MOCY  ');

        $this->assertSame('WZROST', $characterDefinition->name);
        $this->assertSame('wzrost', $characterDefinition->getRawOriginal('normalized_name'));
        $this->assertSame('character', $characterDefinition->getRawOriginal('scope_key'));
        $this->assertSame(
            "world-category:{$category->id}",
            $worldDefinition->getRawOriginal('scope_key')
        );
        $this->assertArrayNotHasKey('normalized_name', $characterDefinition->toArray());
        $this->assertArrayNotHasKey('scope_key', $characterDefinition->toArray());
    }

    public function test_character_definition_name_is_unique_case_insensitively_in_project(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $this->characterDefinitionFor($project, 'Wzrost');

        $this->expectException(QueryException::class);

        $this->characterDefinitionFor($project, '  WZROST  ');
    }

    public function test_world_definition_name_is_unique_in_category_but_reusable_in_other_scopes(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $firstCategory = $this->categoryFor($project, 'Magia');
        $secondCategory = $this->categoryFor($project, 'Przedmioty');
        $first = $this->worldDefinitionFor($project, $firstCategory, 'Koszt');
        $second = $this->worldDefinitionFor($project, $secondCategory, ' KOSZT ');
        $character = $this->characterDefinitionFor($project, 'koszt');

        $this->assertNotSame($first->scope_key, $second->scope_key);
        $this->assertNotSame($first->scope_key, $character->scope_key);

        try {
            $this->worldDefinitionFor($project, $firstCategory, 'KOSZT');
            $this->fail('Duplikat nazwy w jednej kategorii powinien zostać odrzucony.');
        } catch (QueryException) {
            $this->assertDatabaseCount('attribute_definitions', 3);
        }
    }

    public function test_definition_rejects_unsupported_target_and_value_types(): void
    {
        $project = $this->projectFor(User::factory()->create());

        foreach ([
            ['target_type' => 'chapter', 'value_type' => AttributeDefinition::TYPE_TEXT],
            ['target_type' => AttributeDefinition::TARGET_CHARACTER, 'value_type' => 'boolean'],
        ] as $invalid) {
            try {
                AttributeDefinition::create([
                    'project_id' => $project->id,
                    'target_type' => $invalid['target_type'],
                    'name' => 'Niepoprawna definicja',
                    'value_type' => $invalid['value_type'],
                ]);
                $this->fail('Nieobsługiwany typ powinien zostać odrzucony.');
            } catch (InvalidArgumentException) {
                $this->assertDatabaseCount('attribute_definitions', 0);
            }
        }
    }

    public function test_definition_rejects_inconsistent_target_scope(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $category = $this->categoryFor($project);

        foreach ([
            [
                'target_type' => AttributeDefinition::TARGET_CHARACTER,
                'world_element_category_id' => $category->id,
            ],
            [
                'target_type' => AttributeDefinition::TARGET_WORLD_ELEMENT,
                'world_element_category_id' => null,
            ],
        ] as $invalid) {
            try {
                AttributeDefinition::create([
                    'project_id' => $project->id,
                    'world_element_category_id' => $invalid['world_element_category_id'],
                    'target_type' => $invalid['target_type'],
                    'name' => 'Niepoprawny zakres',
                    'value_type' => AttributeDefinition::TYPE_TEXT,
                ]);
                $this->fail('Niespójny zakres powinien zostać odrzucony.');
            } catch (InvalidArgumentException) {
                $this->assertDatabaseCount('attribute_definitions', 0);
            }
        }
    }

    public function test_world_definition_rejects_category_from_another_project(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Pierwszy projekt');
        $otherCategory = $this->categoryFor($this->projectFor($user, 'Drugi projekt'));

        $this->expectException(InvalidArgumentException::class);

        $this->worldDefinitionFor($project, $otherCategory, 'Źródło mocy');
    }

    public function test_text_integer_and_decimal_values_preserve_expected_data(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $textDefinition = $this->characterDefinitionFor($project, 'Frakcja');
        $integerDefinition = $this->characterDefinitionFor(
            $project,
            'Wiek',
            AttributeDefinition::TYPE_NUMBER
        );
        $decimalDefinition = $this->characterDefinitionFor(
            $project,
            'Wzrost',
            AttributeDefinition::TYPE_NUMBER
        );

        $text = AttributeValue::create([
            'attribute_definition_id' => $textDefinition->id,
            'character_id' => $character->id,
            'value_text' => 'Gildia Magów',
        ]);
        $integer = AttributeValue::create([
            'attribute_definition_id' => $integerDefinition->id,
            'character_id' => $character->id,
            'value_number' => 120,
        ]);
        $decimal = AttributeValue::create([
            'attribute_definition_id' => $decimalDefinition->id,
            'character_id' => $character->id,
            'value_number' => '182.375',
        ]);

        $this->assertSame('Gildia Magów', $text->fresh()->value_text);
        $this->assertSame('120.000000', $integer->fresh()->value_number);
        $this->assertSame('182.375000', $decimal->fresh()->value_number);
    }

    public function test_value_requires_exactly_one_entity_and_one_value_column(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $definition = $this->characterDefinitionFor($project, 'Frakcja');
        $character = $this->characterFor($project);
        $element = $this->worldElementFor($this->categoryFor($project));
        $invalidValues = [
            ['value_text' => 'Brak encji'],
            [
                'character_id' => $character->id,
                'world_element_id' => $element->id,
                'value_text' => 'Dwie encje',
            ],
            ['character_id' => $character->id],
            [
                'character_id' => $character->id,
                'value_text' => 'Tekst',
                'value_number' => 1,
            ],
        ];

        foreach ($invalidValues as $attributes) {
            try {
                AttributeValue::create([
                    'attribute_definition_id' => $definition->id,
                    ...$attributes,
                ]);
                $this->fail('Niespójna wartość atrybutu powinna zostać odrzucona.');
            } catch (InvalidArgumentException) {
                $this->assertDatabaseCount('attribute_values', 0);
            }
        }
    }

    public function test_database_checks_reject_invalid_scope_owner_and_value_columns(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $definition = $this->characterDefinitionFor($project, 'Frakcja');
        $character = $this->characterFor($project);

        foreach ([
            [
                'attribute_definition_id' => $definition->id,
                'character_id' => null,
                'world_element_id' => null,
                'value_text' => 'Bez encji',
                'value_number' => null,
            ],
            [
                'attribute_definition_id' => $definition->id,
                'character_id' => $character->id,
                'world_element_id' => null,
                'value_text' => 'Tekst',
                'value_number' => 10,
            ],
        ] as $invalid) {
            try {
                DB::table('attribute_values')->insert($invalid);
                $this->fail('Ograniczenie CHECK powinno odrzucić niespójny rekord.');
            } catch (QueryException) {
                $this->assertDatabaseCount('attribute_values', 0);
            }
        }
    }

    public function test_definition_value_is_unique_per_entity_but_reusable_for_other_entities(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $definition = $this->characterDefinitionFor($project, 'Frakcja');
        $firstCharacter = $this->characterFor($project, 'Anna');
        $secondCharacter = $this->characterFor($project, 'Bartosz');

        AttributeValue::create([
            'attribute_definition_id' => $definition->id,
            'character_id' => $firstCharacter->id,
            'value_text' => 'Północ',
        ]);
        AttributeValue::create([
            'attribute_definition_id' => $definition->id,
            'character_id' => $secondCharacter->id,
            'value_text' => 'Południe',
        ]);

        $this->assertDatabaseCount('attribute_values', 2);

        $this->expectException(QueryException::class);

        AttributeValue::create([
            'attribute_definition_id' => $definition->id,
            'character_id' => $firstCharacter->id,
            'value_text' => 'Duplikat',
        ]);
    }

    public function test_world_definition_value_is_unique_per_world_element(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $category = $this->categoryFor($project);
        $definition = $this->worldDefinitionFor($project, $category, 'Źródło mocy');
        $element = $this->worldElementFor($category);

        AttributeValue::create([
            'attribute_definition_id' => $definition->id,
            'world_element_id' => $element->id,
            'value_text' => 'Ogień',
        ]);

        $this->expectException(QueryException::class);

        AttributeValue::create([
            'attribute_definition_id' => $definition->id,
            'world_element_id' => $element->id,
            'value_text' => 'Duplikat',
        ]);
    }

    public function test_values_cascade_after_deleting_character_world_element_or_definition(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $category = $this->categoryFor($project);
        $character = $this->characterFor($project);
        $element = $this->worldElementFor($category);
        $characterDefinition = $this->characterDefinitionFor($project, 'Frakcja');
        $worldDefinition = $this->worldDefinitionFor($project, $category, 'Źródło');
        $characterValue = AttributeValue::create([
            'attribute_definition_id' => $characterDefinition->id,
            'character_id' => $character->id,
            'value_text' => 'Północ',
        ]);
        $worldValue = AttributeValue::create([
            'attribute_definition_id' => $worldDefinition->id,
            'world_element_id' => $element->id,
            'value_text' => 'Ogień',
        ]);

        $character->delete();
        $this->assertDatabaseMissing('attribute_values', ['id' => $characterValue->id]);

        $element->delete();
        $this->assertDatabaseMissing('attribute_values', ['id' => $worldValue->id]);

        $nextCharacter = $this->characterFor($project, 'Bartosz');
        $nextValue = AttributeValue::create([
            'attribute_definition_id' => $characterDefinition->id,
            'character_id' => $nextCharacter->id,
            'value_text' => 'Południe',
        ]);
        $characterDefinition->delete();
        $this->assertDatabaseMissing('attribute_values', ['id' => $nextValue->id]);
    }

    public function test_definitions_cascade_after_deleting_category_or_project(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Usuwany projekt');
        $category = $this->categoryFor($project);
        $characterDefinition = $this->characterDefinitionFor($project, 'Frakcja');
        $worldDefinition = $this->worldDefinitionFor($project, $category, 'Źródło');

        $category->delete();
        $this->assertDatabaseMissing('attribute_definitions', ['id' => $worldDefinition->id]);
        $this->assertDatabaseHas('attribute_definitions', ['id' => $characterDefinition->id]);

        $secondCategory = $this->categoryFor($project, 'Przedmioty');
        $secondWorldDefinition = $this->worldDefinitionFor($project, $secondCategory, 'Materiał');
        $project->delete();

        $this->assertDatabaseMissing('attribute_definitions', ['id' => $characterDefinition->id]);
        $this->assertDatabaseMissing('attribute_definitions', ['id' => $secondWorldDefinition->id]);
    }

    public function test_definition_policy_allows_owner_and_hides_definition_from_other_user(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $definition = $this->characterDefinitionFor($this->projectFor($owner), 'Wzrost');

        foreach (['view', 'update', 'delete'] as $ability) {
            $this->assertTrue(Gate::forUser($owner)->allows($ability, $definition));

            $response = Gate::forUser($otherUser)->inspect($ability, $definition);
            $this->assertTrue($response->denied());
            $this->assertSame(404, $response->status());
        }
    }

    private function projectFor(User $user, string $name = 'Projekt'): Project
    {
        return Project::create([
            'user_id' => $user->id,
            'name' => $name,
        ]);
    }

    private function categoryFor(Project $project, string $name = 'Magia'): WorldElementCategory
    {
        return WorldElementCategory::create([
            'project_id' => $project->id,
            'name' => $name,
        ]);
    }

    private function characterFor(Project $project, string $name = 'Anna'): Character
    {
        return Character::create([
            'project_id' => $project->id,
            'name' => $name,
        ]);
    }

    private function worldElementFor(
        WorldElementCategory $category,
        string $name = 'Magia ognia',
    ): WorldElement {
        return WorldElement::create([
            'world_element_category_id' => $category->id,
            'name' => $name,
        ]);
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
        string $valueType = AttributeDefinition::TYPE_TEXT,
    ): AttributeDefinition {
        return AttributeDefinition::create([
            'project_id' => $project->id,
            'world_element_category_id' => $category->id,
            'target_type' => AttributeDefinition::TARGET_WORLD_ELEMENT,
            'name' => $name,
            'value_type' => $valueType,
        ]);
    }
}
