<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\CharacterSectionContent;
use App\Models\CharacterSectionDefinition;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;
use Tests\TestCase;

class CharacterSectionFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_schema_relations_and_stable_definition_order(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $later = $this->definitionFor($project, 'Historia', 2);
        $firstWithSameOrder = $this->definitionFor($project, 'Wygląd', 1);
        $secondWithSameOrder = $this->definitionFor($project, 'Osobowość', 1);
        $content = $this->contentFor($character, $later, '<p>Długa treść postaci.</p>');

        $this->assertTrue(Schema::hasColumns('character_section_definitions', [
            'id',
            'project_id',
            'title',
            'normalized_title',
            'sort_order',
            'created_at',
            'updated_at',
        ]));
        $this->assertTrue(Schema::hasColumns('character_section_contents', [
            'id',
            'character_section_definition_id',
            'character_id',
            'content',
            'created_at',
            'updated_at',
        ]));

        $this->assertSame(
            [$firstWithSameOrder->id, $secondWithSameOrder->id, $later->id],
            $project->characterSectionDefinitions->pluck('id')->all()
        );
        $this->assertTrue($later->project->is($project));
        $this->assertTrue($later->contents->contains($content));
        $this->assertTrue($character->sectionContents->contains($content));
        $this->assertTrue($content->definition->is($later));
        $this->assertTrue($content->character->is($character));
    }

    public function test_definition_trims_and_normalizes_title(): void
    {
        $definition = $this->definitionFor(
            $this->projectFor(User::factory()->create()),
            '  OSOBOWOŚĆ  '
        );

        $this->assertSame('OSOBOWOŚĆ', $definition->title);
        $this->assertSame('osobowość', $definition->getRawOriginal('normalized_title'));
        $this->assertArrayNotHasKey('normalized_title', $definition->toArray());
    }

    public function test_definition_rejects_empty_title_and_negative_order(): void
    {
        $project = $this->projectFor(User::factory()->create());

        foreach ([
            ['title' => '   ', 'sort_order' => 0],
            ['title' => 'Historia', 'sort_order' => -1],
        ] as $attributes) {
            try {
                CharacterSectionDefinition::create([
                    'project_id' => $project->id,
                    ...$attributes,
                ]);
                $this->fail('Niepoprawna definicja sekcji powinna zostać odrzucona.');
            } catch (InvalidArgumentException) {
                $this->assertDatabaseCount('character_section_definitions', 0);
            }
        }
    }

    public function test_definition_title_is_unique_case_insensitively_in_project(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $this->definitionFor($project, 'Historia');

        $this->expectException(QueryException::class);

        $this->definitionFor($project, '  HISTORIA  ');
    }

    public function test_same_definition_title_can_be_used_in_different_projects(): void
    {
        $user = User::factory()->create();
        $first = $this->definitionFor($this->projectFor($user, 'Pierwszy'), 'Historia');
        $second = $this->definitionFor($this->projectFor($user, 'Drugi'), 'HISTORIA');

        $this->assertNotSame($first->project_id, $second->project_id);
        $this->assertDatabaseCount('character_section_definitions', 2);
    }

    public function test_character_can_have_only_one_content_for_definition(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $definition = $this->definitionFor($project, 'Historia');
        $this->contentFor($character, $definition, '<p>Pierwsza treść.</p>');

        $this->expectException(QueryException::class);

        $this->contentFor($character, $definition, '<p>Duplikat.</p>');
    }

    public function test_content_rejects_definition_from_another_project(): void
    {
        $user = User::factory()->create();
        $character = $this->characterFor($this->projectFor($user, 'Pierwszy'));
        $definition = $this->definitionFor($this->projectFor($user, 'Drugi'), 'Historia');

        $this->expectException(InvalidArgumentException::class);

        $this->contentFor($character, $definition, '<p>Niedozwolona treść.</p>');
    }

    public function test_deleting_character_cascades_its_section_contents(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $definition = $this->definitionFor($project, 'Historia');
        $content = $this->contentFor($character, $definition, '<p>Treść.</p>');

        $character->delete();

        $this->assertDatabaseMissing('character_section_contents', ['id' => $content->id]);
        $this->assertDatabaseHas('character_section_definitions', ['id' => $definition->id]);
    }

    public function test_deleting_definition_cascades_contents_for_all_characters(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $definition = $this->definitionFor($project, 'Historia');
        $firstCharacter = $this->characterFor($project, 'Anna');
        $secondCharacter = $this->characterFor($project, 'Bartosz');
        $this->contentFor($firstCharacter, $definition, '<p>Pierwsza.</p>');
        $this->contentFor($secondCharacter, $definition, '<p>Druga.</p>');

        $definition->delete();

        $this->assertDatabaseCount('character_section_contents', 0);
        $this->assertDatabaseHas('characters', ['id' => $firstCharacter->id]);
        $this->assertDatabaseHas('characters', ['id' => $secondCharacter->id]);
    }

    public function test_deleting_project_cascades_definitions_and_contents(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $definition = $this->definitionFor($project, 'Historia');
        $this->contentFor($character, $definition, '<p>Treść.</p>');

        $project->delete();

        $this->assertDatabaseCount('character_section_definitions', 0);
        $this->assertDatabaseCount('character_section_contents', 0);
    }

    public function test_definition_does_not_create_empty_contents_automatically(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $this->characterFor($project, 'Anna');
        $this->characterFor($project, 'Bartosz');
        $this->definitionFor($project, 'Ciekawostki');

        $this->assertDatabaseCount('character_section_contents', 0);
    }

    public function test_policies_allow_owner_and_hide_resources_from_other_user(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $project = $this->projectFor($owner);
        $character = $this->characterFor($project);
        $definition = $this->definitionFor($project, 'Historia');
        $content = $this->contentFor($character, $definition, '<p>Treść.</p>');

        $this->assertTrue(Gate::forUser($owner)->allows('create', [CharacterSectionDefinition::class, $project]));
        $this->assertTrue(Gate::forUser($owner)->allows('view', $definition));
        $this->assertTrue(Gate::forUser($owner)->allows('create', [CharacterSectionContent::class, $character]));
        $this->assertTrue(Gate::forUser($owner)->allows('update', $content));

        $definitionResponse = Gate::forUser($stranger)->inspect('view', $definition);
        $contentResponse = Gate::forUser($stranger)->inspect('delete', $content);

        $this->assertFalse($definitionResponse->allowed());
        $this->assertSame(404, $definitionResponse->status());
        $this->assertFalse($contentResponse->allowed());
        $this->assertSame(404, $contentResponse->status());
    }

    private function projectFor(User $user, string $name = 'Projekt'): Project
    {
        return Project::create([
            'user_id' => $user->id,
            'name' => $name,
        ]);
    }

    private function characterFor(Project $project, string $name = 'Postać'): Character
    {
        return Character::create([
            'project_id' => $project->id,
            'name' => $name,
        ]);
    }

    private function definitionFor(
        Project $project,
        string $title,
        int $sortOrder = 0
    ): CharacterSectionDefinition {
        return CharacterSectionDefinition::create([
            'project_id' => $project->id,
            'title' => $title,
            'sort_order' => $sortOrder,
        ]);
    }

    private function contentFor(
        Character $character,
        CharacterSectionDefinition $definition,
        string $content
    ): CharacterSectionContent {
        return CharacterSectionContent::create([
            'character_section_definition_id' => $definition->id,
            'character_id' => $character->id,
            'content' => $content,
        ]);
    }
}
