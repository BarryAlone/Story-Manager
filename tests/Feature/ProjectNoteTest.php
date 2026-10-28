<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProjectNoteTest extends TestCase
{
    use RefreshDatabase;

    public function test_note_can_be_created_with_only_a_title(): void
    {
        [$user, $project] = $this->projectForUser();

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/notes", ['title' => 'Pomysł'])
            ->assertCreated()
            ->assertJsonPath('title', 'Pomysł')
            ->assertJsonPath('content', null)
            ->assertJsonPath('image_path', null);
    }

    public function test_note_can_be_created_with_only_content(): void
    {
        [$user, $project] = $this->projectForUser();

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/notes", ['content' => 'Krótka myśl.'])
            ->assertCreated()
            ->assertJsonPath('title', null)
            ->assertJsonPath('content', 'Krótka myśl.');
    }

    public function test_note_can_be_created_with_only_an_image(): void
    {
        Storage::fake('public');
        [$user, $project] = $this->projectForUser();

        $response = $this->actingAs($user)->post(
            "/api/projects/{$project->id}/notes",
            ['image' => $this->fakeImage('idea.png')],
            ['Accept' => 'application/json']
        );

        $response
            ->assertCreated()
            ->assertJsonPath('title', null)
            ->assertJsonPath('content', null);
        Storage::disk('public')->assertExists($response->json('image_path'));
    }

    public function test_note_can_be_created_with_all_fields_and_whitespace_is_trimmed(): void
    {
        Storage::fake('public');
        [$user, $project] = $this->projectForUser();

        $response = $this->actingAs($user)->post(
            "/api/projects/{$project->id}/notes",
            [
                'title' => '  Scena otwarcia  ',
                'content' => '  Bohater wraca do domu.  ',
                'source' => '  Ursula K. Le Guin  ',
                'image' => $this->fakeImage('scene.png'),
            ],
            ['Accept' => 'application/json']
        );

        $response
            ->assertCreated()
            ->assertJsonPath('title', 'Scena otwarcia')
            ->assertJsonPath('content', 'Bohater wraca do domu.')
            ->assertJsonPath('source', 'Ursula K. Le Guin');
        Storage::disk('public')->assertExists($response->json('image_path'));
    }

    public function test_completely_empty_note_is_rejected(): void
    {
        [$user, $project] = $this->projectForUser();

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/notes", [
                'title' => '   ',
                'content' => " \n ",
                'source' => '   ',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('note');

        $this->assertDatabaseCount('project_notes', 0);

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/notes", ['source' => 'Samo źródło'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('note');
    }

    public function test_text_limits_and_invalid_files_are_rejected(): void
    {
        [$user, $project] = $this->projectForUser();

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/notes", ['title' => str_repeat('a', 121)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/notes", ['content' => str_repeat('a', 10001)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('content');

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/notes", [
                'title' => 'Źródło',
                'source' => str_repeat('a', 501),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('source');

        $this->actingAs($user)->post(
            "/api/projects/{$project->id}/notes",
            [
                'title' => 'Plik',
                'image' => UploadedFile::fake()->create('script.svg', 10, 'image/svg+xml'),
            ],
            ['Accept' => 'application/json']
        )->assertUnprocessable()->assertJsonValidationErrors('image');

        $this->actingAs($user)->post(
            "/api/projects/{$project->id}/notes",
            [
                'title' => 'Za duży plik',
                'image' => UploadedFile::fake()->create('large.jpg', 5121, 'image/jpeg'),
            ],
            ['Accept' => 'application/json']
        )->assertUnprocessable()->assertJsonValidationErrors('image');
    }

    public function test_note_can_be_updated_and_fields_can_be_added_later(): void
    {
        Storage::fake('public');
        [$user, $project] = $this->projectForUser();
        $note = ProjectNote::create([
            'project_id' => $project->id,
            'title' => 'Zalążek',
        ]);

        $response = $this->actingAs($user)->post(
            "/api/project-notes/{$note->id}",
            [
                '_method' => 'PATCH',
                'title' => 'Rozwinięty pomysł',
                'content' => 'Pełniejszy opis.',
                'source' => 'https://example.com/inspiracja',
                'image' => $this->fakeImage('expanded.png'),
            ],
            ['Accept' => 'application/json']
        );

        $response
            ->assertOk()
            ->assertJsonPath('title', 'Rozwinięty pomysł')
            ->assertJsonPath('content', 'Pełniejszy opis.')
            ->assertJsonPath('source', 'https://example.com/inspiracja');
        Storage::disk('public')->assertExists($response->json('image_path'));
    }

    public function test_existing_image_counts_as_content_and_replacement_removes_old_file(): void
    {
        Storage::fake('public');
        [$user, $project] = $this->projectForUser();
        $oldPath = $this->fakeImage('old.png')->store('project-notes', 'public');
        $note = ProjectNote::create([
            'project_id' => $project->id,
            'image_path' => $oldPath,
        ]);

        $this->actingAs($user)
            ->post("/api/project-notes/{$note->id}", [
                '_method' => 'PATCH',
                'title' => '   ',
                'content' => '   ',
            ], ['Accept' => 'application/json'])
            ->assertOk();

        $response = $this->actingAs($user)->post(
            "/api/project-notes/{$note->id}",
            [
                '_method' => 'PATCH',
                'image' => $this->fakeImage('new.png'),
            ],
            ['Accept' => 'application/json']
        );

        $response->assertOk();
        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($response->json('image_path'));
    }

    public function test_removing_the_last_non_empty_field_is_rejected(): void
    {
        Storage::fake('public');
        [$user, $project] = $this->projectForUser();
        $path = $this->fakeImage('only.png')->store('project-notes', 'public');
        $note = ProjectNote::create([
            'project_id' => $project->id,
            'image_path' => $path,
        ]);

        $this->actingAs($user)
            ->post("/api/project-notes/{$note->id}", [
                '_method' => 'PATCH',
                'remove_image' => '1',
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('note');

        Storage::disk('public')->assertExists($path);
    }

    public function test_deleting_note_also_deletes_its_image(): void
    {
        Storage::fake('public');
        [$user, $project] = $this->projectForUser();
        $path = $this->fakeImage('delete.png')->store('project-notes', 'public');
        $note = ProjectNote::create([
            'project_id' => $project->id,
            'title' => 'Do usunięcia',
            'image_path' => $path,
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/project-notes/{$note->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('project_notes', ['id' => $note->id]);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_guest_cannot_use_note_endpoints(): void
    {
        [, $project] = $this->projectForUser();
        $note = ProjectNote::create([
            'project_id' => $project->id,
            'title' => 'Prywatna notatka',
        ]);

        $this->getJson("/api/projects/{$project->id}/notes")->assertUnauthorized();
        $this->postJson("/api/projects/{$project->id}/notes", ['title' => 'Nowa'])->assertUnauthorized();
        $this->getJson("/api/project-notes/{$note->id}")->assertUnauthorized();
        $this->patchJson("/api/project-notes/{$note->id}", ['title' => 'Zmiana'])->assertUnauthorized();
        $this->deleteJson("/api/project-notes/{$note->id}")->assertUnauthorized();
    }

    public function test_other_user_gets_not_found_for_project_notes(): void
    {
        [$owner, $project] = $this->projectForUser();
        $otherUser = User::factory()->create();
        $note = ProjectNote::create([
            'project_id' => $project->id,
            'title' => 'Prywatna notatka',
        ]);

        $this->actingAs($otherUser)->getJson("/api/projects/{$project->id}/notes")->assertNotFound();
        $this->actingAs($otherUser)
            ->postJson("/api/projects/{$project->id}/notes", ['title' => 'Wstrzyknięcie'])
            ->assertNotFound();
        $this->actingAs($otherUser)->getJson("/api/project-notes/{$note->id}")->assertNotFound();
        $this->actingAs($otherUser)
            ->patchJson("/api/project-notes/{$note->id}", [
                'title' => 'Zmiana',
                'source' => 'https://example.com/cudze-zrodlo',
            ])
            ->assertNotFound();
        $this->actingAs($otherUser)->deleteJson("/api/project-notes/{$note->id}")->assertNotFound();

        $this->assertDatabaseHas('project_notes', [
            'id' => $note->id,
            'project_id' => $project->id,
            'title' => 'Prywatna notatka',
            'source' => null,
        ]);
        $this->assertNotNull($owner);
    }

    /** @return array{User, Project} */
    private function projectForUser(): array
    {
        $user = User::factory()->create();
        $project = Project::create([
            'user_id' => $user->id,
            'name' => 'Projekt testowy '.fake()->uuid(),
        ]);

        return [$user, $project];
    }

    private function fakeImage(string $name): UploadedFile
    {
        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            true
        );

        return UploadedFile::fake()->createWithContent($name, $png);
    }
}
