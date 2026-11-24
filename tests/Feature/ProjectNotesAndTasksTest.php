<?php

namespace Tests\Feature;

use App\Models\Chapter;
use App\Models\Project;
use App\Models\ProjectNote;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProjectNotesAndTasksTest extends TestCase
{
    use RefreshDatabase;

    public function test_current_schema_and_relations_keep_chapter_notes_separate(): void
    {
        [$user, $project] = $this->projectForUser();
        $note = $this->noteFor($project);
        $task = $this->taskFor($project, ['project_note_id' => $note->id]);
        $chapter = Chapter::create([
            'project_id' => $project->id,
            'name' => 'Rozdział',
            'notes' => 'Niezależna notatka rozdziału',
        ]);

        $this->assertTrue(Schema::hasColumns('project_tasks', [
            'id', 'project_id', 'project_note_id', 'title', 'content', 'completed_at',
            'due_date', 'sort_order', 'created_at', 'updated_at',
        ]));
        $this->assertTrue(Schema::hasColumn('chapters', 'notes'));
        $this->assertTrue($project->tasks->contains($task));
        $this->assertTrue($note->tasks->contains($task));
        $this->assertTrue($task->project->is($project));
        $this->assertTrue($task->note->is($note));
        $this->assertSame('Niezależna notatka rozdziału', $chapter->fresh()->notes);
        $this->assertSame($user->id, $project->user_id);
    }

    public function test_note_crud_sanitization_partial_update_and_sorting_still_work(): void
    {
        [$user, $project] = $this->projectForUser();

        $created = $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/notes", [
                'title' => '  Plan świata  ',
                'content' => '<p onclick="alert(1)">Tekst <strong>ważny</strong></p><script>alert(2)</script>',
            ])
            ->assertCreated()
            ->assertJsonPath('title', 'Plan świata')
            ->assertJsonPath('is_pinned', false);
        $noteId = $created->json('id');
        $this->assertStringContainsString('<strong>ważny</strong>', $created->json('content'));
        $this->assertStringNotContainsString('<script', $created->json('content'));
        $this->assertStringNotContainsString('onclick', $created->json('content'));

        $this->actingAs($user)
            ->patchJson("/api/project-notes/{$noteId}", ['is_pinned' => true])
            ->assertOk()
            ->assertJsonPath('title', 'Plan świata')
            ->assertJsonPath('is_pinned', true);

        $other = $this->noteFor($project, ['title' => 'Nowsza nieprzypięta']);
        $other->forceFill(['updated_at' => now()->addMinute()])->saveQuietly();

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/notes")
            ->assertOk()
            ->assertJsonPath('0.id', $noteId)
            ->assertJsonMissingPath('0.content');

        $this->actingAs($user)->deleteJson("/api/project-notes/{$noteId}")->assertNoContent();
        $this->assertDatabaseMissing('project_notes', ['id' => $noteId]);
    }

    public function test_task_crud_supports_standalone_task_due_date_and_sanitized_html(): void
    {
        [$user, $project] = $this->projectForUser();

        $created = $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/tasks", [
                'title' => '  Opisać finał  ',
                'content' => '<p onclick="alert(1)">Wersja <strong>pierwsza</strong></p><script>alert(2)</script>',
                'due_date' => '2026-12-15',
            ])
            ->assertCreated()
            ->assertJsonPath('title', 'Opisać finał')
            ->assertJsonPath('due_date', '2026-12-15')
            ->assertJsonPath('project_note_id', null)
            ->assertJsonPath('note', null)
            ->assertJsonPath('is_completed', false)
            ->assertJsonPath('sort_order', 0);
        $taskId = $created->json('id');
        $this->assertStringContainsString('<strong>pierwsza</strong>', $created->json('content'));
        $this->assertStringNotContainsString('<script', $created->json('content'));
        $this->assertStringNotContainsString('onclick', $created->json('content'));

        $this->actingAs($user)
            ->patchJson("/api/project-tasks/{$taskId}", [
                'title' => 'Poprawić finał',
                'due_date' => null,
            ])
            ->assertOk()
            ->assertJsonPath('title', 'Poprawić finał')
            ->assertJsonPath('due_date', null)
            ->assertJsonPath('content', $created->json('content'));

        $this->actingAs($user)->deleteJson("/api/project-tasks/{$taskId}")->assertNoContent();
        $this->assertDatabaseMissing('project_tasks', ['id' => $taskId]);
    }

    public function test_task_validation_rejects_invalid_titles_dates_and_content_structures(): void
    {
        [$user, $project] = $this->projectForUser();
        $endpoint = "/api/projects/{$project->id}/tasks";

        $this->actingAs($user)->postJson($endpoint, ['title' => '   '])
            ->assertUnprocessable()->assertJsonValidationErrors('title');
        $this->actingAs($user)->postJson($endpoint, ['title' => str_repeat('a', 501)])
            ->assertUnprocessable()->assertJsonValidationErrors('title');
        $this->actingAs($user)->postJson($endpoint, ['title' => 'Termin', 'due_date' => '2026-02-31'])
            ->assertUnprocessable()->assertJsonValidationErrors('due_date');
        $this->actingAs($user)->postJson($endpoint, ['title' => 'Treść', 'content' => ['nie', 'html']])
            ->assertUnprocessable()->assertJsonValidationErrors('content');

        $this->assertDatabaseCount('project_tasks', 0);
    }

    public function test_task_can_be_assigned_to_and_detached_from_note(): void
    {
        [$user, $project] = $this->projectForUser();
        $note = $this->noteFor($project, ['title' => 'Plan rozdziału']);

        $created = $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/tasks", [
                'title' => 'Rozwinąć scenę',
                'project_note_id' => $note->id,
            ])
            ->assertCreated()
            ->assertJsonPath('project_note_id', $note->id)
            ->assertJsonPath('note.id', $note->id)
            ->assertJsonPath('note.title', 'Plan rozdziału');

        $this->actingAs($user)
            ->patchJson('/api/project-tasks/'.$created->json('id'), ['project_note_id' => null])
            ->assertOk()
            ->assertJsonPath('project_note_id', null)
            ->assertJsonPath('note', null);
    }

    public function test_deleting_note_detaches_tasks_without_deleting_them(): void
    {
        [$user, $project] = $this->projectForUser();
        $note = $this->noteFor($project);
        $task = $this->taskFor($project, ['project_note_id' => $note->id]);

        $this->actingAs($user)->deleteJson("/api/project-notes/{$note->id}")->assertNoContent();

        $this->assertDatabaseHas('project_tasks', [
            'id' => $task->id,
            'project_note_id' => null,
        ]);
    }

    public function test_task_rejects_note_from_other_project_and_hides_foreign_or_missing_note(): void
    {
        [$user, $project] = $this->projectForUser();
        [, $otherOwnedProject] = $this->projectForUser($user);
        $otherOwnedNote = $this->noteFor($otherOwnedProject);
        [$otherUser, $foreignProject] = $this->projectForUser();
        $foreignNote = $this->noteFor($foreignProject);

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/tasks", [
                'title' => 'Błędny projekt',
                'project_note_id' => $otherOwnedNote->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('project_note_id');

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/tasks", [
                'title' => 'Cudza notatka',
                'project_note_id' => $foreignNote->id,
            ])
            ->assertNotFound();

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/tasks", [
                'title' => 'Brak notatki',
                'project_note_id' => 999999,
            ])
            ->assertNotFound();

        $this->assertDatabaseCount('project_tasks', 0);
        $this->assertNotSame($user->id, $otherUser->id);
    }

    public function test_task_list_filters_by_status_and_note_and_keeps_stable_order(): void
    {
        [$user, $project] = $this->projectForUser();
        $note = $this->noteFor($project);
        $activeLater = $this->taskFor($project, ['title' => 'Aktywne drugie', 'sort_order' => 2]);
        $activeFirst = $this->taskFor($project, [
            'title' => 'Aktywne pierwsze',
            'sort_order' => 0,
            'project_note_id' => $note->id,
        ]);
        $completed = $this->taskFor($project, [
            'title' => 'Wykonane',
            'completed_at' => now(),
            'sort_order' => 0,
            'project_note_id' => $note->id,
        ]);

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/tasks?status=all")
            ->assertOk()
            ->assertJsonPath('0.id', $activeFirst->id)
            ->assertJsonPath('1.id', $activeLater->id)
            ->assertJsonPath('2.id', $completed->id);

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/tasks?status=active")
            ->assertOk()->assertJsonCount(2);
        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/tasks?status=completed")
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $completed->id);
        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/tasks?project_note_id={$note->id}")
            ->assertOk()->assertJsonCount(2)
            ->assertJsonPath('0.id', $activeFirst->id)
            ->assertJsonPath('1.id', $completed->id);
    }

    public function test_completion_and_reopening_move_task_to_end_of_target_group(): void
    {
        [$user, $project] = $this->projectForUser();
        $first = $this->taskFor($project, ['title' => 'Pierwsze', 'sort_order' => 0]);
        $this->taskFor($project, ['title' => 'Drugie', 'sort_order' => 1]);
        $completed = $this->taskFor($project, [
            'title' => 'Wykonane',
            'completed_at' => now()->subDay(),
            'sort_order' => 0,
        ]);

        $this->actingAs($user)
            ->patchJson("/api/project-tasks/{$first->id}/completion", ['is_completed' => true])
            ->assertOk()->assertJsonPath('is_completed', true)->assertJsonPath('sort_order', 1);

        $this->actingAs($user)
            ->patchJson("/api/project-tasks/{$completed->id}/completion", ['is_completed' => false])
            ->assertOk()->assertJsonPath('is_completed', false)->assertJsonPath('sort_order', 2);
    }

    public function test_reorder_requires_complete_status_group_and_is_atomic(): void
    {
        [$user, $project] = $this->projectForUser();
        $first = $this->taskFor($project, ['title' => 'Pierwsze', 'sort_order' => 0]);
        $second = $this->taskFor($project, ['title' => 'Drugie', 'sort_order' => 1]);
        $third = $this->taskFor($project, ['title' => 'Trzecie', 'sort_order' => 2]);

        $this->actingAs($user)
            ->patchJson("/api/projects/{$project->id}/tasks/order", [
                'status' => 'active',
                'task_ids' => [$third->id, $first->id, $second->id],
            ])
            ->assertOk()
            ->assertJsonPath('0.id', $third->id)
            ->assertJsonPath('1.id', $first->id)
            ->assertJsonPath('2.id', $second->id);

        $this->actingAs($user)
            ->patchJson("/api/projects/{$project->id}/tasks/order", [
                'status' => 'active',
                'task_ids' => [$first->id],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('task_ids');

        DB::statement(
            'CREATE TRIGGER fail_task_reorder BEFORE UPDATE OF sort_order ON project_tasks '
            .'WHEN NEW.id = '.$second->id.' BEGIN SELECT RAISE(ABORT, "forced failure"); END'
        );

        try {
            $this->actingAs($user)
                ->patchJson("/api/projects/{$project->id}/tasks/order", [
                    'status' => 'active',
                    'task_ids' => [$second->id, $third->id, $first->id],
                ])
                ->assertServerError();
        } finally {
            DB::statement('DROP TRIGGER IF EXISTS fail_task_reorder');
        }

        $this->assertSame(0, $third->fresh()->sort_order);
        $this->assertSame(1, $first->fresh()->sort_order);
        $this->assertSame(2, $second->fresh()->sort_order);
    }

    public function test_guests_and_other_users_cannot_access_tasks(): void
    {
        [$owner, $project] = $this->projectForUser();
        $task = $this->taskFor($project);
        $other = User::factory()->create();

        $this->postJson("/api/projects/{$project->id}/tasks", ['title' => 'Gość'])->assertUnauthorized();
        $this->actingAs($other)->getJson("/api/projects/{$project->id}/tasks")->assertNotFound();
        $this->actingAs($other)->getJson("/api/project-tasks/{$task->id}")->assertNotFound();
        $this->actingAs($other)->patchJson("/api/project-tasks/{$task->id}", ['title' => 'Cudze'])->assertNotFound();
        $this->actingAs($other)->patchJson("/api/project-tasks/{$task->id}/completion", ['is_completed' => true])->assertNotFound();
        $this->actingAs($other)->deleteJson("/api/project-tasks/{$task->id}")->assertNotFound();
        $this->assertDatabaseHas('project_tasks', ['id' => $task->id]);
        $this->assertNotSame($owner->id, $other->id);
    }

    public function test_deleting_project_cascades_its_notes_and_tasks_only(): void
    {
        [$user, $project] = $this->projectForUser();
        $note = $this->noteFor($project);
        $task = $this->taskFor($project, ['project_note_id' => $note->id]);
        [, $otherProject] = $this->projectForUser();
        $otherTask = $this->taskFor($otherProject, ['title' => 'Zachowane']);

        $this->actingAs($user)->deleteJson("/api/projects/{$project->id}")->assertOk();

        $this->assertDatabaseMissing('project_notes', ['id' => $note->id]);
        $this->assertDatabaseMissing('project_tasks', ['id' => $task->id]);
        $this->assertDatabaseHas('project_tasks', ['id' => $otherTask->id]);
    }

    /** @return array{User, Project} */
    private function projectForUser(?User $user = null): array
    {
        $user ??= User::factory()->create();
        $project = Project::create([
            'user_id' => $user->id,
            'name' => 'Projekt testowy '.uniqid(),
        ]);

        return [$user, $project];
    }

    private function noteFor(Project $project, array $overrides = []): ProjectNote
    {
        return $project->projectNotes()->create([
            'title' => 'Notatka projektu',
            'content' => '<p>Treść</p>',
            ...$overrides,
        ]);
    }

    private function taskFor(Project $project, array $overrides = []): ProjectTask
    {
        return $project->tasks()->create([
            'title' => 'Zadanie projektu',
            'sort_order' => 0,
            ...$overrides,
        ]);
    }
}
