<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\CharacterSectionContent;
use App\Models\CharacterSectionDefinition;
use App\Models\Project;
use App\Models\User;
use App\Services\ChapterContentSanitizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CharacterSectionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_definition_or_content_endpoints(): void
    {
        $project = $this->projectFor(User::factory()->create());
        $character = $this->characterFor($project);
        $definition = $this->definitionFor($project, 'Historia');

        $this->getJson("/api/projects/{$project->id}/character-section-definitions")->assertUnauthorized();
        $this->postJson("/api/projects/{$project->id}/character-section-definitions", ['title' => 'Nowa'])->assertUnauthorized();
        $this->getJson("/api/projects/{$project->id}/character-section-layout")->assertUnauthorized();
        $this->patchJson("/api/projects/{$project->id}/character-section-layout", [
            'definition_ids' => [$definition->id],
            'gallery_position' => 0,
        ])->assertUnauthorized();
        $this->getJson("/api/characters/{$character->id}/section-contents")->assertUnauthorized();
        $this->putJson("/api/characters/{$character->id}/section-contents/{$definition->id}", [
            'content' => '<p>Treść</p>',
        ])->assertUnauthorized();
    }

    public function test_foreign_projects_definitions_and_characters_are_hidden(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $project = $this->projectFor($owner);
        $character = $this->characterFor($project);
        $definition = $this->definitionFor($project, 'Historia');

        $this->actingAs($stranger)
            ->getJson("/api/projects/{$project->id}/character-section-definitions")
            ->assertNotFound();
        $this->actingAs($stranger)
            ->getJson("/api/projects/{$project->id}/character-section-layout")
            ->assertNotFound();
        $this->actingAs($stranger)
            ->patchJson("/api/character-section-definitions/{$definition->id}", ['title' => 'Obca'])
            ->assertNotFound();
        $this->actingAs($stranger)
            ->getJson("/api/characters/{$character->id}/section-contents")
            ->assertNotFound();
        $this->actingAs($stranger)
            ->deleteJson("/api/characters/{$character->id}/section-contents/{$definition->id}")
            ->assertNotFound();
    }

    public function test_definition_list_is_empty_and_then_returns_stable_order_without_technical_fields(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/character-section-definitions")
            ->assertOk()
            ->assertExactJson([]);

        $later = $this->definitionFor($project, 'Historia', 3);
        $first = $this->definitionFor($project, 'Wygląd', 1);
        $second = $this->definitionFor($project, 'Osobowość', 1);

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/character-section-definitions")
            ->assertOk()
            ->assertJsonCount(3)
            ->assertJsonPath('0.id', $first->id)
            ->assertJsonPath('1.id', $second->id)
            ->assertJsonPath('2.id', $later->id)
            ->assertJsonPath('0.contents_count', 0)
            ->assertJsonMissingPath('0.normalized_title');
    }

    public function test_owner_can_create_definitions_with_trimmed_title_and_next_order(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $this->definitionFor($project, 'Pierwsza', 2);
        $this->definitionFor($project, 'Druga', 7);

        $response = $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/character-section-definitions", [
                'title' => '  Historia  ',
                'project_id' => 999999,
                'normalized_title' => 'podsunięta',
                'sort_order' => 400,
                'contents_count' => 12,
            ])
            ->assertCreated()
            ->assertJsonPath('title', 'Historia')
            ->assertJsonPath('sort_order', 8)
            ->assertJsonPath('contents_count', 0)
            ->assertJsonMissingPath('normalized_title');

        $definition = CharacterSectionDefinition::findOrFail($response->json('id'));
        $this->assertSame($project->id, $definition->project_id);
        $this->assertSame('historia', $definition->getRawOriginal('normalized_title'));
    }

    public function test_creation_and_rename_validate_normalized_uniqueness(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $first = $this->definitionFor($project, 'Historia');
        $second = $this->definitionFor($project, 'Wygląd', 1);

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/character-section-definitions", ['title' => ' HISTORIA '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/character-section-definitions", ['title' => '   '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
        $this->actingAs($user)
            ->patchJson("/api/character-section-definitions/{$second->id}", ['title' => ' historia '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');

        $this->actingAs($user)
            ->patchJson("/api/character-section-definitions/{$first->id}", [
                'title' => '  Dzieje  ',
                'sort_order' => 999,
                'project_id' => 999999,
            ])
            ->assertOk()
            ->assertJsonPath('title', 'Dzieje')
            ->assertJsonPath('sort_order', 0);
    }

    public function test_owner_can_reorder_all_definitions_atomically(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $first = $this->definitionFor($project, 'Pierwsza', 0);
        $second = $this->definitionFor($project, 'Druga', 1);
        $third = $this->definitionFor($project, 'Trzecia', 2);

        $this->actingAs($user)
            ->patchJson("/api/projects/{$project->id}/character-section-definitions/order", [
                'definition_ids' => [$third->id, $first->id, $second->id],
            ])
            ->assertOk()
            ->assertJsonPath('0.id', $third->id)
            ->assertJsonPath('0.sort_order', 0)
            ->assertJsonPath('1.id', $first->id)
            ->assertJsonPath('2.id', $second->id);

        $this->assertDatabaseHas('character_section_definitions', ['id' => $third->id, 'sort_order' => 0]);
        $this->assertDatabaseHas('character_section_definitions', ['id' => $first->id, 'sort_order' => 1]);
        $this->assertDatabaseHas('character_section_definitions', ['id' => $second->id, 'sort_order' => 2]);
    }

    public function test_reorder_rejects_missing_foreign_and_repeated_ids_without_partial_changes(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Pierwszy');
        $otherProject = $this->projectFor($user, 'Drugi');
        $first = $this->definitionFor($project, 'Pierwsza', 0);
        $second = $this->definitionFor($project, 'Druga', 1);
        $foreign = $this->definitionFor($otherProject, 'Obca', 0);
        $endpoint = "/api/projects/{$project->id}/character-section-definitions/order";

        foreach ([
            [$first->id],
            [$first->id, $foreign->id],
            [$first->id, $first->id],
        ] as $invalidOrder) {
            $this->actingAs($user)
                ->patchJson($endpoint, ['definition_ids' => $invalidOrder])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('definition_ids');

            $this->assertDatabaseHas('character_section_definitions', ['id' => $first->id, 'sort_order' => 0]);
            $this->assertDatabaseHas('character_section_definitions', ['id' => $second->id, 'sort_order' => 1]);
        }
    }

    public function test_owner_can_place_gallery_between_sections_atomically(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $first = $this->definitionFor($project, 'Pierwsza', 0);
        $second = $this->definitionFor($project, 'Druga', 1);
        $third = $this->definitionFor($project, 'Trzecia', 2);
        $endpoint = "/api/projects/{$project->id}/character-section-layout";

        $this->actingAs($user)
            ->getJson($endpoint)
            ->assertOk()
            ->assertJsonPath('gallery_position', 3)
            ->assertJsonPath('definitions.0.id', $first->id);

        $this->actingAs($user)
            ->patchJson($endpoint, [
                'definition_ids' => [$third->id, $first->id, $second->id],
                'gallery_position' => 1,
            ])
            ->assertOk()
            ->assertJsonPath('gallery_position', 1)
            ->assertJsonPath('definitions.0.id', $third->id)
            ->assertJsonPath('definitions.1.id', $first->id)
            ->assertJsonPath('definitions.2.id', $second->id);

        $this->assertSame(1, $project->fresh()->character_gallery_position);
        $this->assertDatabaseHas('character_section_definitions', ['id' => $third->id, 'sort_order' => 0]);
        $this->assertDatabaseHas('character_section_definitions', ['id' => $first->id, 'sort_order' => 1]);
        $this->assertDatabaseHas('character_section_definitions', ['id' => $second->id, 'sort_order' => 2]);
    }

    public function test_gallery_at_end_remains_at_end_after_creating_definition(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $first = $this->definitionFor($project, 'Pierwsza', 0);
        $endpoint = "/api/projects/{$project->id}/character-section-layout";

        $this->actingAs($user)->patchJson($endpoint, [
            'definition_ids' => [$first->id],
            'gallery_position' => 1,
        ])->assertOk();

        $this->assertNull($project->fresh()->character_gallery_position);

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/character-section-definitions", ['title' => 'Druga'])
            ->assertCreated();

        $this->actingAs($user)
            ->getJson($endpoint)
            ->assertOk()
            ->assertJsonPath('gallery_position', 2)
            ->assertJsonCount(2, 'definitions');
    }

    public function test_layout_rejects_invalid_ids_and_gallery_position_without_partial_changes(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Pierwszy');
        $otherProject = $this->projectFor($user, 'Drugi');
        $first = $this->definitionFor($project, 'Pierwsza', 0);
        $second = $this->definitionFor($project, 'Druga', 1);
        $foreign = $this->definitionFor($otherProject, 'Obca', 0);
        $endpoint = "/api/projects/{$project->id}/character-section-layout";

        foreach ([
            ['definition_ids' => [$first->id], 'gallery_position' => 0, 'field' => 'definition_ids'],
            ['definition_ids' => [$first->id, $foreign->id], 'gallery_position' => 1, 'field' => 'definition_ids'],
            ['definition_ids' => [$first->id, $second->id], 'gallery_position' => 3, 'field' => 'gallery_position'],
        ] as $payload) {
            $field = $payload['field'];
            unset($payload['field']);
            $this->actingAs($user)
                ->patchJson($endpoint, $payload)
                ->assertUnprocessable()
                ->assertJsonValidationErrors($field);

            $this->assertDatabaseHas('character_section_definitions', ['id' => $first->id, 'sort_order' => 0]);
            $this->assertDatabaseHas('character_section_definitions', ['id' => $second->id, 'sort_order' => 1]);
            $this->assertNull($project->fresh()->character_gallery_position);
        }
    }

    public function test_deleting_section_before_gallery_preserves_visual_position(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $first = $this->definitionFor($project, 'Pierwsza', 0);
        $second = $this->definitionFor($project, 'Druga', 1);
        $third = $this->definitionFor($project, 'Trzecia', 2);
        $project->update(['character_gallery_position' => 2]);

        $this->actingAs($user)
            ->deleteJson("/api/character-section-definitions/{$first->id}")
            ->assertNoContent();

        $this->assertSame(1, $project->fresh()->character_gallery_position);

        $this->actingAs($user)
            ->deleteJson("/api/character-section-definitions/{$third->id}")
            ->assertNoContent();

        $this->assertSame(1, $project->fresh()->character_gallery_position);
        $this->assertDatabaseHas('character_section_definitions', ['id' => $second->id]);
    }

    public function test_layout_database_failure_rolls_back_definitions_and_gallery_position(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $first = $this->definitionFor($project, 'Pierwsza', 0);
        $second = $this->definitionFor($project, 'Druga', 1);
        DB::statement(
            'CREATE TRIGGER fail_character_layout BEFORE UPDATE OF character_gallery_position ON projects '
            ."BEGIN SELECT RAISE(ABORT, 'forced layout failure'); END"
        );

        $this->actingAs($user)
            ->patchJson("/api/projects/{$project->id}/character-section-layout", [
                'definition_ids' => [$second->id, $first->id],
                'gallery_position' => 0,
            ])
            ->assertServerError();

        $this->assertDatabaseHas('character_section_definitions', ['id' => $first->id, 'sort_order' => 0]);
        $this->assertDatabaseHas('character_section_definitions', ['id' => $second->id, 'sort_order' => 1]);
        $this->assertNull($project->fresh()->character_gallery_position);
    }

    public function test_contents_count_and_safe_definition_deletion_contract(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $character = $this->characterFor($project);
        $used = $this->definitionFor($project, 'Historia');
        $empty = $this->definitionFor($project, 'Wygląd', 1);
        $content = $this->contentFor($character, $used, '<p>Treść.</p>');

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/character-section-definitions")
            ->assertOk()
            ->assertJsonPath('0.contents_count', 1)
            ->assertJsonPath('1.contents_count', 0);

        $this->actingAs($user)
            ->deleteJson("/api/character-section-definitions/{$empty->id}")
            ->assertNoContent();
        $this->actingAs($user)
            ->deleteJson("/api/character-section-definitions/{$used->id}")
            ->assertConflict()
            ->assertJsonPath('contents_count', 1);
        $this->assertDatabaseHas('character_section_contents', ['id' => $content->id]);

        $this->actingAs($user)
            ->deleteJson("/api/character-section-definitions/{$used->id}?force=true")
            ->assertNoContent();
        $this->assertDatabaseMissing('character_section_definitions', ['id' => $used->id]);
        $this->assertDatabaseMissing('character_section_contents', ['id' => $content->id]);
    }

    public function test_definition_delete_rejects_invalid_force(): void
    {
        $user = User::factory()->create();
        $definition = $this->definitionFor($this->projectFor($user), 'Historia');

        $this->actingAs($user)
            ->deleteJson("/api/character-section-definitions/{$definition->id}?force=perhaps")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('force');

        $this->assertDatabaseHas('character_section_definitions', ['id' => $definition->id]);
    }

    public function test_content_index_returns_every_definition_with_null_for_empty_sections(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $character = $this->characterFor($project);
        $later = $this->definitionFor($project, 'Historia', 3);
        $first = $this->definitionFor($project, 'Wygląd', 1);
        $content = $this->contentFor($character, $later, '<p>Historia.</p>');

        $this->actingAs($user)
            ->getJson("/api/characters/{$character->id}/section-contents")
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.id', $first->id)
            ->assertJsonPath('0.content_id', null)
            ->assertJsonPath('0.content', null)
            ->assertJsonPath('1.id', $later->id)
            ->assertJsonPath('1.content_id', $content->id)
            ->assertJsonPath('1.content', '<p>Historia.</p>');
    }

    public function test_content_upsert_creates_then_updates_without_duplicate(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $character = $this->characterFor($project);
        $definition = $this->definitionFor($project, 'Historia');
        $endpoint = "/api/characters/{$character->id}/section-contents/{$definition->id}";

        $contentId = $this->actingAs($user)
            ->putJson($endpoint, ['content' => '<p>Pierwsza treść.</p>'])
            ->assertCreated()
            ->assertJsonPath('content', '<p>Pierwsza treść.</p>')
            ->json('id');

        $this->actingAs($user)
            ->putJson($endpoint, ['content' => '<p>Druga treść.</p>'])
            ->assertOk()
            ->assertJsonPath('id', $contentId)
            ->assertJsonPath('content', '<p>Druga treść.</p>');

        $this->assertDatabaseCount('character_section_contents', 1);
    }

    public function test_content_delete_is_idempotent_and_keeps_global_definition(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $character = $this->characterFor($project);
        $definition = $this->definitionFor($project, 'Historia');
        $content = $this->contentFor($character, $definition, '<p>Treść.</p>');
        $endpoint = "/api/characters/{$character->id}/section-contents/{$definition->id}";

        $this->actingAs($user)->deleteJson($endpoint)->assertNoContent();
        $this->actingAs($user)->deleteJson($endpoint)->assertNoContent();

        $this->assertDatabaseMissing('character_section_contents', ['id' => $content->id]);
        $this->assertDatabaseHas('character_section_definitions', ['id' => $definition->id]);
    }

    public function test_content_rejects_definition_from_another_project_and_preserves_existing_data(): void
    {
        $user = User::factory()->create();
        $firstProject = $this->projectFor($user, 'Pierwszy');
        $secondProject = $this->projectFor($user, 'Drugi');
        $character = $this->characterFor($firstProject);
        $ownDefinition = $this->definitionFor($firstProject, 'Historia');
        $foreignDefinition = $this->definitionFor($secondProject, 'Historia');
        $existing = $this->contentFor($character, $ownDefinition, '<p>Bez zmian.</p>');

        $this->actingAs($user)
            ->putJson(
                "/api/characters/{$character->id}/section-contents/{$foreignDefinition->id}",
                ['content' => '<p>Niedozwolona treść.</p>']
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('definition');

        $this->assertDatabaseCount('character_section_contents', 1);
        $this->assertSame('<p>Bez zmian.</p>', $existing->fresh()->content);
    }

    public function test_sanitizer_preserves_supported_editor_formatting_and_secures_links(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $character = $this->characterFor($project);
        $definition = $this->definitionFor($project, 'Historia');
        $html = '<h2>Nagłówek</h2><p><strong>Ważne</strong> i <em>kursywa</em></p>'
            .'<ul><li>Punkt</li></ul><blockquote>Cytat</blockquote>'
            .'<a href="https://example.com" target="_blank">Źródło</a>';

        $content = $this->actingAs($user)
            ->putJson(
                "/api/characters/{$character->id}/section-contents/{$definition->id}",
                ['content' => $html]
            )
            ->assertCreated()
            ->json('content');

        $this->assertStringContainsString('<h2>Nagłówek</h2>', $content);
        $this->assertStringContainsString('<strong>Ważne</strong>', $content);
        $this->assertStringContainsString('<ul><li>Punkt</li></ul>', $content);
        $this->assertStringContainsString('<blockquote>Cytat</blockquote>', $content);
        $this->assertStringContainsString('href="https://example.com"', $content);
        $this->assertStringContainsString('rel="noopener noreferrer"', $content);
    }

    public function test_sanitizer_removes_active_content_event_handlers_and_unsafe_urls(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $character = $this->characterFor($project);
        $definition = $this->definitionFor($project, 'Historia');
        $unsafe = '<p onclick="alert(1)">Tekst<img src=x onerror="alert(1)"></p>'
            .'<script>alert(1)</script><iframe src="https://example.com"></iframe>'
            .'<form action="/"><input></form><object data="x"></object>'
            .'<a href="javascript:alert(1)">Niebezpieczny link</a>';

        $content = $this->actingAs($user)
            ->putJson(
                "/api/characters/{$character->id}/section-contents/{$definition->id}",
                ['content' => $unsafe]
            )
            ->assertCreated()
            ->json('content');

        $this->assertStringContainsString('Tekst', $content);
        $this->assertStringNotContainsString('<script', $content);
        $this->assertStringNotContainsString('<iframe', $content);
        $this->assertStringNotContainsString('<form', $content);
        $this->assertStringNotContainsString('<object', $content);
        $this->assertStringNotContainsString('onclick', $content);
        $this->assertStringNotContainsString('onerror', $content);
        $this->assertStringNotContainsString('javascript:', $content);
    }

    public function test_empty_or_oversized_content_is_rejected_without_overwriting_existing_data(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $character = $this->characterFor($project);
        $definition = $this->definitionFor($project, 'Historia');
        $existing = $this->contentFor($character, $definition, '<p>Zachowana treść.</p>');
        $endpoint = "/api/characters/{$character->id}/section-contents/{$definition->id}";

        foreach ([
            '<p>&nbsp; <br></p><script>alert(1)</script>',
            str_repeat('a', ChapterContentSanitizer::MAX_CONTENT_LENGTH + 1),
        ] as $invalidContent) {
            $this->actingAs($user)
                ->putJson($endpoint, ['content' => $invalidContent])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('content');

            $this->assertSame('<p>Zachowana treść.</p>', $existing->fresh()->content);
        }
    }

    private function projectFor(User $user, string $name = 'Projekt'): Project
    {
        return Project::create(['user_id' => $user->id, 'name' => $name]);
    }

    private function characterFor(Project $project, string $name = 'Anna'): Character
    {
        return Character::create(['project_id' => $project->id, 'name' => $name]);
    }

    private function definitionFor(
        Project $project,
        string $title,
        int $sortOrder = 0,
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
        string $content,
    ): CharacterSectionContent {
        return CharacterSectionContent::create([
            'character_section_definition_id' => $definition->id,
            'character_id' => $character->id,
            'content' => $content,
        ]);
    }
}
