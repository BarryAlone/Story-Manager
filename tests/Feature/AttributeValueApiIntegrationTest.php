<?php

namespace Tests\Feature;

use App\Models\AttributeDefinition;
use App\Models\Character;
use App\Models\Project;
use App\Models\User;
use App\Models\WorldElement;
use App\Models\WorldElementCategory;
use App\Services\AttributeValueSynchronizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use stdClass;
use Tests\TestCase;

class AttributeValueApiIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_remains_unauthorized_for_integrated_entity_endpoints(): void
    {
        $owner = User::factory()->create();
        $project = $this->projectFor($owner);
        $category = $this->categoryFor($project);
        $character = $this->characterFor($project);
        $element = $this->elementFor($category);

        $this->postJson('/api/characters', [
            'project_id' => $project->id,
            'name' => 'Gość',
            'attribute_values' => new stdClass,
        ])->assertUnauthorized();
        $this->putJson("/api/characters/{$character->id}", [
            'name' => 'Gość',
            'attribute_values' => new stdClass,
        ])->assertUnauthorized();
        $this->postJson("/api/world-element-categories/{$category->id}/world-elements", [
            'name' => 'Gość',
            'attribute_values' => new stdClass,
        ])->assertUnauthorized();
        $this->patchJson("/api/world-elements/{$element->id}", [
            'name' => 'Gość',
            'attribute_values' => new stdClass,
        ])->assertUnauthorized();
    }

    public function test_character_can_be_created_and_shown_with_text_and_number_values(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $text = $this->characterDefinitionFor($project, 'Wzrost');
        $number = $this->characterDefinitionFor(
            $project,
            'Waga',
            AttributeDefinition::TYPE_NUMBER,
        );

        $response = $this->actingAs($user)->postJson('/api/characters', [
            'project_id' => $project->id,
            'name' => 'Anna',
            'attribute_values' => [
                (string) $text->id => 'Wysoka',
                (string) $number->id => '62.500000',
            ],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath("attribute_values.{$text->id}", 'Wysoka')
            ->assertJsonPath("attribute_values.{$number->id}", '62.500000');

        $characterId = $response->json('id');

        $this->actingAs($user)->getJson("/api/characters/{$characterId}")
            ->assertOk()
            ->assertJsonPath("character.attribute_values.{$text->id}", 'Wysoka')
            ->assertJsonPath("character.attribute_values.{$number->id}", '62.500000');
    }

    public function test_character_update_preserves_values_when_field_is_missing_and_empty_object_clears_them(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $definition = $this->characterDefinitionFor($project, 'Frakcja');
        $character = $this->characterFor($project, 'Anna');
        $this->sync($character, [$definition->id => 'Północ']);

        $this->actingAs($user)->putJson("/api/characters/{$character->id}", [
            'name' => 'Anna po zmianie',
        ])
            ->assertOk()
            ->assertJsonPath("attribute_values.{$definition->id}", 'Północ');

        $this->assertDatabaseHas('attribute_values', [
            'attribute_definition_id' => $definition->id,
            'value_text' => 'Północ',
        ]);
        $response = $this->actingAs($user)->putJson("/api/characters/{$character->id}", [
            'name' => 'Anna po zmianie',
            'attribute_values' => new stdClass,
        ])->assertOk();

        $this->assertStringContainsString('"attribute_values":{}', $response->getContent());
        $this->assertDatabaseCount('attribute_values', 0);
    }

    public function test_invalid_character_value_rolls_back_character_update_and_existing_values(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $definition = $this->characterDefinitionFor(
            $project,
            'Waga',
            AttributeDefinition::TYPE_NUMBER,
        );
        $character = $this->characterFor($project, 'Anna');
        $this->sync($character, [$definition->id => '60.500000']);

        $this->actingAs($user)->putJson("/api/characters/{$character->id}", [
            'name' => 'Nie powinna zostać',
            'attribute_values' => [(string) $definition->id => 'błędna'],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors("attribute_values.{$definition->id}");

        $this->assertSame('Anna', $character->fresh()->name);
        $this->assertSame(
            '60.500000',
            $character->attributeValues()->firstOrFail()->fresh()->value_number,
        );
    }

    public function test_invalid_character_value_does_not_leave_created_character(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $definition = $this->characterDefinitionFor(
            $project,
            'Waga',
            AttributeDefinition::TYPE_NUMBER,
        );

        $this->actingAs($user)->postJson('/api/characters', [
            'project_id' => $project->id,
            'name' => 'Nie powstanie',
            'attribute_values' => [(string) $definition->id => 'błędna'],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors("attribute_values.{$definition->id}");

        $this->assertDatabaseMissing('characters', ['name' => 'Nie powstanie']);
        $this->assertDatabaseCount('attribute_values', 0);
    }

    public function test_world_element_can_be_created_updated_and_shown_with_values(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);
        $text = $this->worldDefinitionFor($category, 'Źródło');
        $number = $this->worldDefinitionFor(
            $category,
            'Moc',
            AttributeDefinition::TYPE_NUMBER,
        );

        $response = $this->actingAs($user)->postJson(
            "/api/world-element-categories/{$category->id}/world-elements",
            [
                'name' => 'Magia ognia',
                'attribute_values' => [
                    (string) $text->id => 'Żywioł',
                    (string) $number->id => '120.250000',
                ],
            ],
        );

        $response
            ->assertCreated()
            ->assertJsonPath("attribute_values.{$text->id}", 'Żywioł')
            ->assertJsonPath("attribute_values.{$number->id}", '120.250000');

        $elementId = $response->json('id');

        $this->actingAs($user)->patchJson("/api/world-elements/{$elementId}", [
            'name' => 'Magia płomienia',
            'attribute_values' => [
                (string) $text->id => 'Ogień',
                (string) $number->id => '130.000000',
            ],
        ])
            ->assertOk()
            ->assertJsonPath('name', 'Magia płomienia')
            ->assertJsonPath("attribute_values.{$text->id}", 'Ogień')
            ->assertJsonPath("attribute_values.{$number->id}", '130.000000');

        $this->actingAs($user)->getJson("/api/world-elements/{$elementId}")
            ->assertOk()
            ->assertJsonPath("attribute_values.{$text->id}", 'Ogień')
            ->assertJsonPath("attribute_values.{$number->id}", '130.000000');
    }

    public function test_world_element_update_preserves_missing_values_and_empty_object_clears_them(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);
        $definition = $this->worldDefinitionFor($category, 'Źródło');
        $element = $this->elementFor($category);
        $this->sync($element, [$definition->id => 'Żywioł']);

        $this->actingAs($user)->patchJson("/api/world-elements/{$element->id}", [
            'description' => 'Nowy opis',
        ])
            ->assertOk()
            ->assertJsonPath("attribute_values.{$definition->id}", 'Żywioł');

        $response = $this->actingAs($user)->patchJson("/api/world-elements/{$element->id}", [
            'attribute_values' => new stdClass,
        ])->assertOk();

        $this->assertStringContainsString('"attribute_values":{}', $response->getContent());
        $this->assertDatabaseCount('attribute_values', 0);
    }

    public function test_definition_from_another_world_category_rolls_back_element_update(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project, 'Magia');
        $otherCategory = $this->categoryFor($project, 'Przedmioty');
        $definition = $this->worldDefinitionFor($otherCategory, 'Materiał');
        $element = $this->elementFor($category, 'Magia ognia');

        $this->actingAs($user)->patchJson("/api/world-elements/{$element->id}", [
            'name' => 'Nie powinna zostać',
            'attribute_values' => [(string) $definition->id => 'Stal'],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors("attribute_values.{$definition->id}");

        $this->assertSame('Magia ognia', $element->fresh()->name);
        $this->assertDatabaseCount('attribute_values', 0);
    }

    public function test_multipart_requests_store_images_and_attribute_values_for_both_entities(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $characterDefinition = $this->characterDefinitionFor($project, 'Frakcja');
        $category = $this->categoryFor($project);
        $elementDefinition = $this->worldDefinitionFor($category, 'Źródło');

        $characterResponse = $this->actingAs($user)->post('/api/characters', [
            'project_id' => $project->id,
            'name' => 'Anna',
            'character_image' => $this->fakePng('anna.png'),
            'attribute_values' => json_encode([
                (string) $characterDefinition->id => 'Północ',
            ], JSON_THROW_ON_ERROR),
        ], ['Accept' => 'application/json']);

        $characterResponse
            ->assertCreated()
            ->assertJsonPath("attribute_values.{$characterDefinition->id}", 'Północ');
        Storage::disk('public')->assertExists($characterResponse->json('character_image'));

        $elementResponse = $this->actingAs($user)->post(
            "/api/world-element-categories/{$category->id}/world-elements",
            [
                'name' => 'Las',
                'image' => $this->fakePng('las.png'),
                'attribute_values' => json_encode([
                    (string) $elementDefinition->id => 'Natura',
                ], JSON_THROW_ON_ERROR),
            ],
            ['Accept' => 'application/json'],
        );

        $elementResponse
            ->assertCreated()
            ->assertJsonPath("attribute_values.{$elementDefinition->id}", 'Natura');
        Storage::disk('public')->assertExists($elementResponse->json('image_path'));
    }

    public function test_invalid_multipart_json_returns_validation_error(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->projectFor($user);

        $this->actingAs($user)->post('/api/characters', [
            'project_id' => $project->id,
            'name' => 'Nie powstanie',
            'character_image' => $this->fakePng('invalid.png'),
            'attribute_values' => '{invalid',
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('attribute_values');

        $this->assertDatabaseMissing('characters', ['name' => 'Nie powstanie']);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_invalid_attribute_removes_new_image_and_created_element(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);
        $definition = $this->worldDefinitionFor(
            $category,
            'Moc',
            AttributeDefinition::TYPE_NUMBER,
        );

        $this->actingAs($user)->post(
            "/api/world-element-categories/{$category->id}/world-elements",
            [
                'name' => 'Nie powstanie',
                'image' => $this->fakePng('invalid.png'),
                'attribute_values' => json_encode([
                    (string) $definition->id => 'błędna',
                ], JSON_THROW_ON_ERROR),
            ],
            ['Accept' => 'application/json'],
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors("attribute_values.{$definition->id}");

        $this->assertDatabaseMissing('world_elements', ['name' => 'Nie powstanie']);
        $this->assertSame([], Storage::disk('public')->allFiles('world-elements'));
    }

    public function test_character_attribute_failure_cleans_new_file_and_preserves_old_image_and_data(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $definition = $this->characterDefinitionFor(
            $project,
            'Waga',
            AttributeDefinition::TYPE_NUMBER,
        );

        $this->actingAs($user)->post('/api/characters', [
            'project_id' => $project->id,
            'name' => 'Nie powstanie',
            'character_image' => $this->fakePng('invalid-create.png'),
            'attribute_values' => json_encode([
                (string) $definition->id => 'błędna',
            ], JSON_THROW_ON_ERROR),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors("attribute_values.{$definition->id}");

        $this->assertDatabaseMissing('characters', ['name' => 'Nie powstanie']);
        $this->assertSame([], Storage::disk('public')->allFiles('characters'));

        $character = $this->characterFor($project, 'Anna');
        $character->update(['character_image' => 'characters/old.png']);
        $this->sync($character, [$definition->id => '60.000000']);
        Storage::disk('public')->put('characters/old.png', 'old');

        $this->actingAs($user)->post("/api/characters/{$character->id}", [
            '_method' => 'PUT',
            'name' => 'Nie powinna zostać',
            'character_image' => $this->fakePng('invalid-update.png'),
            'attribute_values' => json_encode([
                (string) $definition->id => 'błędna',
            ], JSON_THROW_ON_ERROR),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors("attribute_values.{$definition->id}");

        $this->assertSame('Anna', $character->fresh()->name);
        $this->assertSame('characters/old.png', $character->character_image);
        $this->assertSame('60.000000', $character->attributeValues()->firstOrFail()->value_number);
        Storage::disk('public')->assertExists('characters/old.png');
        $this->assertSame(['characters/old.png'], Storage::disk('public')->allFiles('characters'));
    }

    public function test_failed_attribute_update_preserves_old_world_element_image_data_and_values(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);
        $definition = $this->worldDefinitionFor(
            $category,
            'Moc',
            AttributeDefinition::TYPE_NUMBER,
        );
        $element = $this->elementFor($category, 'Las', 'world-elements/old.png');
        $this->sync($element, [$definition->id => '10.000000']);
        Storage::disk('public')->put('world-elements/old.png', 'old');

        $this->actingAs($user)->post("/api/world-elements/{$element->id}", [
            '_method' => 'PATCH',
            'name' => 'Nie powinna zostać',
            'image' => $this->fakePng('replacement.png'),
            'attribute_values' => json_encode([
                (string) $definition->id => 'błędna',
            ], JSON_THROW_ON_ERROR),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors("attribute_values.{$definition->id}");

        $this->assertSame('Las', $element->fresh()->name);
        $this->assertSame('world-elements/old.png', $element->image_path);
        $this->assertSame('10.000000', $element->attributeValues()->firstOrFail()->value_number);
        Storage::disk('public')->assertExists('world-elements/old.png');
        $this->assertSame(['world-elements/old.png'], Storage::disk('public')->allFiles('world-elements'));
    }

    public function test_foreign_definition_is_rejected_and_resource_security_is_unchanged(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $project = $this->projectFor($owner, 'Własny');
        $otherProject = $this->projectFor($other, 'Obcy');
        $foreignDefinition = $this->characterDefinitionFor($otherProject, 'Sekret');
        $character = $this->characterFor($project, 'Anna');

        $this->actingAs($owner)->putJson("/api/characters/{$character->id}", [
            'name' => 'Nie powinna zostać',
            'attribute_values' => [(string) $foreignDefinition->id => 'Cudze'],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors("attribute_values.{$foreignDefinition->id}");

        $this->assertSame('Anna', $character->fresh()->name);
        $this->actingAs($other)->getJson("/api/characters/{$character->id}")->assertNotFound();
        $this->actingAs($other)->putJson("/api/characters/{$character->id}", [
            'name' => 'Cudza zmiana',
            'attribute_values' => new stdClass,
        ])->assertNotFound();
    }

    public function test_json_array_is_rejected_because_attribute_values_must_be_an_object(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);

        $this->actingAs($user)->postJson('/api/characters', [
            'project_id' => $project->id,
            'name' => 'Nie powstanie',
            'attribute_values' => [],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('attribute_values');

        $this->assertDatabaseMissing('characters', ['name' => 'Nie powstanie']);
    }

    /** @param array<int|string, mixed> $values */
    private function sync(Character|WorldElement $entity, array $values): void
    {
        app(AttributeValueSynchronizer::class)->sync($entity, $values);
    }

    private function projectFor(User $user, string $name = 'Projekt'): Project
    {
        return Project::create(['user_id' => $user->id, 'name' => $name]);
    }

    private function characterFor(Project $project, string $name = 'Postać'): Character
    {
        return Character::create([
            'project_id' => $project->id,
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

    private function elementFor(
        WorldElementCategory $category,
        string $name = 'Las',
        ?string $imagePath = null,
    ): WorldElement {
        return WorldElement::create([
            'world_element_category_id' => $category->id,
            'name' => $name,
            'image_path' => $imagePath,
        ]);
    }

    private function characterDefinitionFor(
        Project $project,
        string $name,
        string $valueType = AttributeDefinition::TYPE_TEXT,
    ): AttributeDefinition {
        return AttributeDefinition::create([
            'project_id' => $project->id,
            'target_type' => AttributeDefinition::TARGET_CHARACTER,
            'name' => $name,
            'value_type' => $valueType,
            'sort_order' => 0,
        ]);
    }

    private function worldDefinitionFor(
        WorldElementCategory $category,
        string $name,
        string $valueType = AttributeDefinition::TYPE_TEXT,
    ): AttributeDefinition {
        return AttributeDefinition::create([
            'project_id' => $category->project_id,
            'world_element_category_id' => $category->id,
            'target_type' => AttributeDefinition::TARGET_WORLD_ELEMENT,
            'name' => $name,
            'value_type' => $valueType,
            'sort_order' => 0,
        ]);
    }

    private function fakePng(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8xkAAAAASUVORK5CYII=',
                true,
            ),
        );
    }
}
