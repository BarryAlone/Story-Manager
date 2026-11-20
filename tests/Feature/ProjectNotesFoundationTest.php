<?php

namespace Tests\Feature;

use App\Models\Chapter;
use App\Models\Project;
use App\Models\ProjectChecklistItem;
use App\Models\ProjectNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProjectNotesFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_schema_and_relations_are_separate_from_chapter_notes(): void
    {
        [$user, $project] = $this->projectForUser();
        $note = $project->projectNotes()->create([
            'title' => 'Notatka projektu',
            'content' => '<p>Treść projektu</p>',
        ]);
        $item = $project->projectChecklistItems()->create([
            'content' => 'Zadanie projektu',
            'sort_order' => 0,
        ]);
        $chapter = Chapter::create([
            'project_id' => $project->id,
            'name' => 'Rozdział',
            'notes' => 'Niezależna notatka rozdziału',
        ]);

        $this->assertTrue(Schema::hasColumns('project_notes', [
            'id', 'project_id', 'title', 'content', 'is_pinned', 'created_at', 'updated_at',
        ]));
        $this->assertTrue(Schema::hasColumns('project_checklist_items', [
            'id', 'project_id', 'content', 'completed_at', 'due_date', 'sort_order', 'created_at', 'updated_at',
        ]));
        $this->assertTrue(Schema::hasColumn('chapters', 'notes'));
        $this->assertTrue($project->projectNotes->contains($note));
        $this->assertTrue($project->projectChecklistItems->contains($item));
        $this->assertTrue($note->project->is($project));
        $this->assertTrue($item->project->is($project));
        $this->assertSame('Niezależna notatka rozdziału', $chapter->fresh()->notes);
        $this->assertSame($user->id, $project->user_id);
    }

    public function test_note_crud_trims_title_and_list_omits_full_content(): void
    {
        [$user, $project] = $this->projectForUser();

        $created = $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/notes", [
                'title' => '  Plan świata  ',
                'content' => '<p>Pierwsza wersja</p>',
            ])
            ->assertCreated()
            ->assertJsonPath('title', 'Plan świata')
            ->assertJsonPath('content', '<p>Pierwsza wersja</p>')
            ->assertJsonPath('is_pinned', false);
        $noteId = $created->json('id');

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/notes")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $noteId)
            ->assertJsonMissingPath('0.content');

        $this->actingAs($user)
            ->getJson("/api/project-notes/{$noteId}")
            ->assertOk()
            ->assertJsonPath('content', '<p>Pierwsza wersja</p>');

        $this->actingAs($user)
            ->patchJson("/api/project-notes/{$noteId}", [
                'title' => '  Zmieniony plan  ',
                'content' => '',
            ])
            ->assertOk()
            ->assertJsonPath('title', 'Zmieniony plan')
            ->assertJsonPath('content', null);

        $this->actingAs($user)
            ->deleteJson("/api/project-notes/{$noteId}")
            ->assertNoContent();
        $this->assertDatabaseMissing('project_notes', ['id' => $noteId]);
    }

    public function test_note_html_is_sanitized_with_the_shared_editor_rules(): void
    {
        [$user, $project] = $this->projectForUser();

        $content = $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/notes", [
                'title' => 'Bezpieczna treść',
                'content' => '<p onclick="alert(1)">Tekst <strong>ważny</strong></p><script>alert(2)</script><a href="javascript:alert(3)">Link</a>',
            ])
            ->assertCreated()
            ->json('content');

        $this->assertStringContainsString('<strong>ważny</strong>', $content);
        $this->assertStringNotContainsString('<script', $content);
        $this->assertStringNotContainsString('onclick', $content);
        $this->assertStringNotContainsString('javascript:', $content);
    }

    public function test_note_partial_update_preserves_omitted_fields_for_future_autosave(): void
    {
        [$user, $project] = $this->projectForUser();
        $note = $this->noteFor($project, [
            'title' => 'Oryginalny tytuł',
            'content' => '<p>Oryginalna treść</p>',
            'is_pinned' => false,
        ]);

        $this->actingAs($user)
            ->patchJson("/api/project-notes/{$note->id}", ['is_pinned' => true])
            ->assertOk()
            ->assertJsonPath('is_pinned', true);

        $this->actingAs($user)
            ->patchJson("/api/project-notes/{$note->id}", ['content' => '<p>Nowa treść</p>'])
            ->assertOk()
            ->assertJsonPath('title', 'Oryginalny tytuł')
            ->assertJsonPath('content', '<p>Nowa treść</p>')
            ->assertJsonPath('is_pinned', true);

        $this->actingAs($user)
            ->patchJson("/api/project-notes/{$note->id}", ['is_pinned' => false])
            ->assertOk()
            ->assertJsonPath('content', '<p>Nowa treść</p>')
            ->assertJsonPath('is_pinned', false);
    }

    public function test_notes_are_sorted_pinned_first_then_by_latest_update(): void
    {
        [$user, $project] = $this->projectForUser();
        $older = $this->noteFor($project, ['title' => 'Starsza']);
        $newer = $this->noteFor($project, ['title' => 'Nowsza']);
        $pinned = $this->noteFor($project, ['title' => 'Przypięta', 'is_pinned' => true]);
        $older->forceFill(['updated_at' => now()->subDays(3)])->saveQuietly();
        $newer->forceFill(['updated_at' => now()->subDay()])->saveQuietly();
        $pinned->forceFill(['updated_at' => now()->subWeek()])->saveQuietly();

        $response = $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/notes")
            ->assertOk();

        $this->assertSame(
            [$pinned->id, $newer->id, $older->id],
            array_column($response->json(), 'id'),
        );
    }

    public function test_note_validation_rejects_blank_and_oversized_titles(): void
    {
        [$user, $project] = $this->projectForUser();

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/notes", ['title' => '   '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/notes", ['title' => str_repeat('a', 161)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
    }

    public function test_checklist_crud_supports_due_date_and_trimmed_content(): void
    {
        [$user, $project] = $this->projectForUser();

        $created = $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/checklist-items", [
                'content' => '  Opisać finał  ',
                'due_date' => '2026-12-15',
            ])
            ->assertCreated()
            ->assertJsonPath('content', 'Opisać finał')
            ->assertJsonPath('due_date', '2026-12-15')
            ->assertJsonPath('is_completed', false)
            ->assertJsonPath('sort_order', 0);
        $itemId = $created->json('id');

        $this->actingAs($user)
            ->getJson("/api/project-checklist-items/{$itemId}")
            ->assertOk()
            ->assertJsonPath('id', $itemId);
        $this->actingAs($user)
            ->patchJson("/api/project-checklist-items/{$itemId}", [
                'content' => 'Poprawić finał',
                'due_date' => null,
            ])
            ->assertOk()
            ->assertJsonPath('content', 'Poprawić finał')
            ->assertJsonPath('due_date', null);
        $this->actingAs($user)
            ->deleteJson("/api/project-checklist-items/{$itemId}")
            ->assertNoContent();
        $this->assertDatabaseMissing('project_checklist_items', ['id' => $itemId]);
    }

    public function test_checklist_validates_content_and_due_date(): void
    {
        [$user, $project] = $this->projectForUser();
        $endpoint = "/api/projects/{$project->id}/checklist-items";

        $this->actingAs($user)
            ->postJson($endpoint, ['content' => '   '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('content');
        $this->actingAs($user)
            ->postJson($endpoint, ['content' => str_repeat('a', 501)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('content');
        $this->actingAs($user)
            ->postJson($endpoint, ['content' => 'Termin', 'due_date' => '2026-02-31'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('due_date');

        $this->assertDatabaseCount('project_checklist_items', 0);
    }

    public function test_checklist_item_can_be_completed_and_reopened_at_end_of_target_group(): void
    {
        [$user, $project] = $this->projectForUser();
        $first = $this->checklistItemFor($project, ['content' => 'Pierwsze', 'sort_order' => 0]);
        $second = $this->checklistItemFor($project, ['content' => 'Drugie', 'sort_order' => 1]);
        $completed = $this->checklistItemFor($project, [
            'content' => 'Wykonane',
            'completed_at' => now()->subDay(),
            'sort_order' => 0,
        ]);

        $this->actingAs($user)
            ->patchJson("/api/project-checklist-items/{$first->id}/completion", ['is_completed' => true])
            ->assertOk()
            ->assertJsonPath('is_completed', true)
            ->assertJsonPath('sort_order', 1);

        $this->actingAs($user)
            ->patchJson("/api/project-checklist-items/{$completed->id}/completion", ['is_completed' => false])
            ->assertOk()
            ->assertJsonPath('is_completed', false)
            ->assertJsonPath('sort_order', 2);

        $this->assertNotNull($first->fresh()->completed_at);
        $this->assertNull($completed->fresh()->completed_at);
        $this->assertFalse($second->fresh()->completed_at !== null);
    }

    public function test_checklist_filters_and_places_active_items_before_completed_items(): void
    {
        [$user, $project] = $this->projectForUser();
        $activeLater = $this->checklistItemFor($project, ['content' => 'Aktywne drugie', 'sort_order' => 2]);
        $activeFirst = $this->checklistItemFor($project, ['content' => 'Aktywne pierwsze', 'sort_order' => 0]);
        $completed = $this->checklistItemFor($project, [
            'content' => 'Wykonane',
            'completed_at' => now(),
            'sort_order' => 0,
        ]);

        $all = $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/checklist-items")
            ->assertOk();
        $this->assertSame([$activeFirst->id, $activeLater->id, $completed->id], array_column($all->json(), 'id'));

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/checklist-items?status=active")
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonMissing(['id' => $completed->id]);
        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/checklist-items?status=completed")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $completed->id);
    }

    public function test_checklist_reorder_requires_the_complete_selected_scope(): void
    {
        [$user, $project] = $this->projectForUser();
        $first = $this->checklistItemFor($project, ['content' => 'Pierwsze', 'sort_order' => 0]);
        $second = $this->checklistItemFor($project, ['content' => 'Drugie', 'sort_order' => 1]);
        $completed = $this->checklistItemFor($project, [
            'content' => 'Wykonane',
            'completed_at' => now(),
            'sort_order' => 0,
        ]);

        $this->actingAs($user)
            ->patchJson("/api/projects/{$project->id}/checklist-items/order", [
                'status' => 'active',
                'item_ids' => [$second->id],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('item_ids');

        $response = $this->actingAs($user)
            ->patchJson("/api/projects/{$project->id}/checklist-items/order", [
                'status' => 'active',
                'item_ids' => [$second->id, $first->id],
            ])
            ->assertOk();

        $this->assertSame([$second->id, $first->id], array_column($response->json(), 'id'));
        $this->assertSame(0, $second->fresh()->sort_order);
        $this->assertSame(1, $first->fresh()->sort_order);
        $this->assertSame(0, $completed->fresh()->sort_order);
    }

    public function test_checklist_reorder_is_atomic_on_database_failure(): void
    {
        [$user, $project] = $this->projectForUser();
        $first = $this->checklistItemFor($project, ['content' => 'Pierwsze', 'sort_order' => 0]);
        $second = $this->checklistItemFor($project, ['content' => 'Drugie', 'sort_order' => 1]);
        $third = $this->checklistItemFor($project, ['content' => 'Trzecie', 'sort_order' => 2]);
        DB::statement(
            'CREATE TRIGGER fail_checklist_reorder BEFORE UPDATE OF sort_order ON project_checklist_items '
            ."WHEN NEW.id = {$second->id} BEGIN SELECT RAISE(ABORT, 'forced reorder failure'); END"
        );

        try {
            $this->actingAs($user)
                ->patchJson("/api/projects/{$project->id}/checklist-items/order", [
                    'status' => 'active',
                    'item_ids' => [$third->id, $second->id, $first->id],
                ])
                ->assertServerError();
        } finally {
            DB::statement('DROP TRIGGER IF EXISTS fail_checklist_reorder');
        }

        $this->assertSame(0, $first->fresh()->sort_order);
        $this->assertSame(1, $second->fresh()->sort_order);
        $this->assertSame(2, $third->fresh()->sort_order);
    }

    public function test_guest_is_unauthorized_and_foreign_resources_are_hidden(): void
    {
        [$owner, $project] = $this->projectForUser();
        [$other, $otherProject] = $this->projectForUser();
        $note = $this->noteFor($project);
        $item = $this->checklistItemFor($project);

        $this->getJson("/api/projects/{$project->id}/notes")->assertUnauthorized();
        $this->postJson("/api/projects/{$project->id}/checklist-items", ['content' => 'Gość'])->assertUnauthorized();

        $this->actingAs($other)->getJson("/api/projects/{$project->id}/notes")->assertNotFound();
        $this->actingAs($other)->postJson("/api/projects/{$project->id}/notes", ['title' => 'Cudza'])->assertNotFound();
        $this->actingAs($other)->getJson("/api/project-notes/{$note->id}")->assertNotFound();
        $this->actingAs($other)->patchJson("/api/project-notes/{$note->id}", ['title' => 'Cudza'])->assertNotFound();
        $this->actingAs($other)->deleteJson("/api/project-notes/{$note->id}")->assertNotFound();
        $this->actingAs($other)->getJson("/api/projects/{$project->id}/checklist-items")->assertNotFound();
        $this->actingAs($other)->getJson("/api/project-checklist-items/{$item->id}")->assertNotFound();
        $this->actingAs($other)->patchJson("/api/project-checklist-items/{$item->id}", ['content' => 'Cudze'])->assertNotFound();
        $this->actingAs($other)->patchJson("/api/project-checklist-items/{$item->id}/completion", ['is_completed' => true])->assertNotFound();
        $this->actingAs($other)->deleteJson("/api/project-checklist-items/{$item->id}")->assertNotFound();
        $this->actingAs($other)->patchJson("/api/projects/{$project->id}/checklist-items/order", [
            'status' => 'active',
            'item_ids' => [$item->id],
        ])->assertNotFound();

        $this->assertDatabaseHas('project_notes', ['id' => $note->id, 'project_id' => $owner->projects()->first()->id]);
        $this->assertDatabaseHas('project_checklist_items', ['id' => $item->id]);
        $this->assertNotSame($project->id, $otherProject->id);
    }

    public function test_deleting_project_cascades_notes_and_checklist_without_affecting_other_project(): void
    {
        [$user, $project] = $this->projectForUser();
        [, $otherProject] = $this->projectForUser($user);
        $note = $this->noteFor($project);
        $item = $this->checklistItemFor($project);
        $otherNote = $this->noteFor($otherProject, ['title' => 'Zachowana']);
        $otherItem = $this->checklistItemFor($otherProject, ['content' => 'Zachowane']);

        $this->actingAs($user)->deleteJson("/api/projects/{$project->id}")->assertOk();

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseMissing('project_notes', ['id' => $note->id]);
        $this->assertDatabaseMissing('project_checklist_items', ['id' => $item->id]);
        $this->assertDatabaseHas('project_notes', ['id' => $otherNote->id]);
        $this->assertDatabaseHas('project_checklist_items', ['id' => $otherItem->id]);
    }

    /** @return array{User, Project} */
    private function projectForUser(?User $user = null): array
    {
        $user ??= User::factory()->create();
        $project = Project::create([
            'user_id' => $user->id,
            'name' => 'Projekt '.fake()->uuid(),
        ]);

        return [$user, $project];
    }

    /** @param array<string, mixed> $overrides */
    private function noteFor(Project $project, array $overrides = []): ProjectNote
    {
        return $project->projectNotes()->create([
            'title' => 'Notatka',
            'content' => null,
            'is_pinned' => false,
            ...$overrides,
        ]);
    }

    /** @param array<string, mixed> $overrides */
    private function checklistItemFor(Project $project, array $overrides = []): ProjectChecklistItem
    {
        return $project->projectChecklistItems()->create([
            'content' => 'Zadanie',
            'completed_at' => null,
            'due_date' => null,
            'sort_order' => 0,
            ...$overrides,
        ]);
    }
}
