<?php

namespace Tests\Feature;

use App\Models\AttributeDefinition;
use App\Models\AttributeValue;
use App\Models\Character;
use App\Models\Project;
use App\Models\User;
use App\Models\WorldElement;
use App\Models\WorldElementCategory;
use App\Services\AttributeValueSynchronizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AttributeValueSynchronizerTest extends TestCase
{
    use RefreshDatabase;

    private AttributeValueSynchronizer $synchronizer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->synchronizer = app(AttributeValueSynchronizer::class);
    }

    public function test_it_creates_text_and_number_values_for_character(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $text = $this->characterDefinitionFor($project, 'Frakcja');
        $number = $this->characterDefinitionFor(
            $project,
            'Wzrost',
            AttributeDefinition::TYPE_NUMBER,
            sortOrder: 1,
        );

        $values = $this->synchronizer->sync($character, [
            $text->id => 'Gildia Magów',
            $number->id => '182.375',
        ]);

        $this->assertCount(2, $values);
        $this->assertSame([$text->id, $number->id], $values->pluck('attribute_definition_id')->all());
        $this->assertDatabaseHas('attribute_values', [
            'attribute_definition_id' => $text->id,
            'character_id' => $character->id,
            'world_element_id' => null,
            'value_text' => 'Gildia Magów',
            'value_number' => null,
        ]);
        $this->assertSame(
            '182.375000',
            AttributeValue::where('attribute_definition_id', $number->id)->firstOrFail()->value_number
        );
    }

    public function test_it_creates_values_for_world_element_in_its_category(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $category = $this->categoryFor($project);
        $element = $this->worldElementFor($category);
        $text = $this->worldDefinitionFor($project, $category, 'Źródło mocy');
        $number = $this->worldDefinitionFor(
            $project,
            $category,
            'Liczba użytkowników',
            AttributeDefinition::TYPE_NUMBER,
        );

        $this->synchronizer->sync($element, [
            $text->id => 'Żywioł ognia',
            $number->id => 120,
        ]);

        $this->assertDatabaseHas('attribute_values', [
            'attribute_definition_id' => $text->id,
            'character_id' => null,
            'world_element_id' => $element->id,
            'value_text' => 'Żywioł ognia',
        ]);
        $this->assertSame(
            '120.000000',
            AttributeValue::where('attribute_definition_id', $number->id)->firstOrFail()->value_number
        );
    }

    public function test_it_updates_existing_value_without_creating_duplicate(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $definition = $this->characterDefinitionFor($project, 'Frakcja');

        $this->synchronizer->sync($character, [$definition->id => 'Północ']);
        $originalId = AttributeValue::firstOrFail()->id;
        $this->synchronizer->sync($character, [$definition->id => 'Południe']);
        $this->synchronizer->sync($character, [$definition->id => 'Wschód']);

        $this->assertDatabaseCount('attribute_values', 1);
        $this->assertDatabaseHas('attribute_values', [
            'id' => $originalId,
            'value_text' => 'Wschód',
        ]);
    }

    public function test_null_empty_and_whitespace_values_delete_existing_records(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $nullDefinition = $this->characterDefinitionFor($project, 'Pierwsza');
        $emptyDefinition = $this->characterDefinitionFor($project, 'Druga');
        $whitespaceDefinition = $this->characterDefinitionFor($project, 'Trzecia');

        $this->synchronizer->sync($character, [
            $nullDefinition->id => 'A',
            $emptyDefinition->id => 'B',
            $whitespaceDefinition->id => 'C',
        ]);
        $this->synchronizer->sync($character, [
            $nullDefinition->id => null,
            $emptyDefinition->id => '',
            $whitespaceDefinition->id => " \t\n ",
        ]);

        $this->assertDatabaseCount('attribute_values', 0);
    }

    public function test_omitted_definition_is_removed_by_complete_sync(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $kept = $this->characterDefinitionFor($project, 'Zachowana');
        $omitted = $this->characterDefinitionFor($project, 'Pominięta');

        $this->synchronizer->sync($character, [
            $kept->id => 'Zostaje',
            $omitted->id => 'Znika',
        ]);
        $this->synchronizer->sync($character, [$kept->id => 'Nadal zostaje']);

        $this->assertDatabaseCount('attribute_values', 1);
        $this->assertDatabaseHas('attribute_values', [
            'attribute_definition_id' => $kept->id,
            'value_text' => 'Nadal zostaje',
        ]);
        $this->assertDatabaseMissing('attribute_values', [
            'attribute_definition_id' => $omitted->id,
        ]);
    }

    public function test_numbers_preserve_precision_and_support_integer_decimal_negative_and_zero(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $integer = $this->characterDefinitionFor($project, 'Całkowita', AttributeDefinition::TYPE_NUMBER);
        $decimal = $this->characterDefinitionFor($project, 'Dziesiętna', AttributeDefinition::TYPE_NUMBER);
        $negative = $this->characterDefinitionFor($project, 'Ujemna', AttributeDefinition::TYPE_NUMBER);
        $zero = $this->characterDefinitionFor($project, 'Zero', AttributeDefinition::TYPE_NUMBER);

        $this->synchronizer->sync($character, [
            $integer->id => 42,
            $decimal->id => '123456.123456',
            $negative->id => '-0.000001',
            $zero->id => '-0.000000',
        ]);

        $stored = $character->attributeValues()->get()->keyBy('attribute_definition_id');
        $this->assertSame('42.000000', $stored[$integer->id]->value_number);
        $this->assertSame('123456.123456', $stored[$decimal->id]->value_number);
        $this->assertSame('-0.000001', $stored[$negative->id]->value_number);
        $this->assertSame('0.000000', $stored[$zero->id]->value_number);
    }

    public function test_it_rejects_unsupported_text_and_number_structures(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $text = $this->characterDefinitionFor($project, 'Tekst');
        $number = $this->characterDefinitionFor($project, 'Liczba', AttributeDefinition::TYPE_NUMBER);
        $invalidCases = [
            [$text->id => ['tablica']],
            [$text->id => 123],
            [$number->id => ['12.5']],
            [$number->id => '1e3'],
            [$number->id => 12.5],
        ];

        foreach ($invalidCases as $payload) {
            try {
                $this->synchronizer->sync($character, $payload);
                $this->fail('Nieobsługiwana struktura wartości powinna zostać odrzucona.');
            } catch (ValidationException $error) {
                $this->assertArrayHasKey(
                    'attribute_values.'.array_key_first($payload),
                    $error->errors()
                );
                $this->assertDatabaseCount('attribute_values', 0);
            }
        }
    }

    public function test_it_rejects_text_over_explicit_limit(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $definition = $this->characterDefinitionFor($project, 'Tekst');

        $this->expectFieldValidationError(
            $character,
            $definition->id,
            str_repeat('a', AttributeValueSynchronizer::MAX_TEXT_LENGTH + 1),
        );
    }

    public function test_it_rejects_number_outside_decimal_precision_or_scale(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $definition = $this->characterDefinitionFor($project, 'Liczba', AttributeDefinition::TYPE_NUMBER);

        foreach (['100000000000000', '1.1234567', '--1', '12.', '.5'] as $invalid) {
            $this->expectFieldValidationError($character, $definition->id, $invalid);
        }
    }

    public function test_it_rejects_definition_from_another_project(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Pierwszy');
        $otherProject = $this->projectFor($user, 'Drugi');
        $character = $this->characterFor($project);
        $foreign = $this->characterDefinitionFor($otherProject, 'Obca');

        $this->expectFieldValidationError($character, $foreign->id, 'Wartość');
    }

    public function test_it_rejects_definition_with_wrong_target_type(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $category = $this->categoryFor($project);
        $character = $this->characterFor($project);
        $worldDefinition = $this->worldDefinitionFor($project, $category, 'Światowa');

        $this->expectFieldValidationError($character, $worldDefinition->id, 'Wartość');
    }

    public function test_it_rejects_world_definition_from_another_category(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $category = $this->categoryFor($project, 'Magia');
        $otherCategory = $this->categoryFor($project, 'Przedmioty');
        $element = $this->worldElementFor($category);
        $otherDefinition = $this->worldDefinitionFor($project, $otherCategory, 'Materiał');

        $this->expectFieldValidationError($element, $otherDefinition->id, 'Wartość');
    }

    public function test_it_rejects_missing_definition_id(): void
    {
        $character = $this->characterFor($this->projectFor(User::factory()->create()));

        $this->expectFieldValidationError($character, 999999, 'Wartość');
    }

    public function test_invalid_entry_prevents_all_updates_and_deletions(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $existing = $this->characterDefinitionFor($project, 'Istniejąca');
        $new = $this->characterDefinitionFor($project, 'Nowa');
        $this->synchronizer->sync($character, [$existing->id => 'Oryginał']);

        try {
            $this->synchronizer->sync($character, [
                $new->id => 'Nie może zostać zapisane',
                999999 => 'Błędna definicja',
            ]);
            $this->fail('Niepoprawny zestaw powinien zostać odrzucony atomowo.');
        } catch (ValidationException $error) {
            $this->assertArrayHasKey('attribute_values.999999', $error->errors());
        }

        $this->assertDatabaseCount('attribute_values', 1);
        $this->assertDatabaseHas('attribute_values', [
            'attribute_definition_id' => $existing->id,
            'value_text' => 'Oryginał',
        ]);
        $this->assertDatabaseMissing('attribute_values', [
            'attribute_definition_id' => $new->id,
        ]);
    }

    private function expectFieldValidationError(
        Character|WorldElement $entity,
        int $definitionId,
        mixed $value,
    ): void {
        try {
            $this->synchronizer->sync($entity, [$definitionId => $value]);
            $this->fail('Niepoprawna wartość powinna zostać odrzucona.');
        } catch (ValidationException $error) {
            $this->assertArrayHasKey('attribute_values.'.$definitionId, $error->errors());
        }
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
