<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectInspiration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProjectInspirationTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_list_and_show_project_inspirations(): void
    {
        [$user, $project] = $this->projectForUser();
        $inspiration = ProjectInspiration::create([
            'project_id' => $project->id,
            'title' => 'Inspiracja projektu',
        ]);
        $otherProject = Project::create([
            'user_id' => $user->id,
            'name' => 'Inny projekt '.fake()->uuid(),
        ]);
        ProjectInspiration::create([
            'project_id' => $otherProject->id,
            'title' => 'Inna inspiracja',
        ]);

        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/inspirations")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $inspiration->id);

        $this->actingAs($user)
            ->getJson("/api/project-inspirations/{$inspiration->id}")
            ->assertOk()
            ->assertJsonPath('id', $inspiration->id)
            ->assertJsonPath('title', 'Inspiracja projektu');
    }

    public function test_inspiration_can_be_created_with_only_a_title(): void
    {
        [$user, $project] = $this->projectForUser();

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/inspirations", ['title' => 'Pomysł'])
            ->assertCreated()
            ->assertJsonPath('title', 'Pomysł')
            ->assertJsonPath('content', null)
            ->assertJsonPath('image_path', null);
    }

    public function test_inspiration_can_be_created_with_only_content(): void
    {
        [$user, $project] = $this->projectForUser();

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/inspirations", ['content' => 'Krótka myśl.'])
            ->assertCreated()
            ->assertJsonPath('title', null)
            ->assertJsonPath('content', 'Krótka myśl.');
    }

    public function test_inspiration_can_be_created_with_only_an_image(): void
    {
        Storage::fake('public');
        [$user, $project] = $this->projectForUser();

        $response = $this->actingAs($user)->post(
            "/api/projects/{$project->id}/inspirations",
            ['image' => $this->fakeImage('idea.png')],
            ['Accept' => 'application/json']
        );

        $response
            ->assertCreated()
            ->assertJsonPath('title', null)
            ->assertJsonPath('content', null);
        $this->assertStringStartsWith('project-inspirations/', $response->json('image_path'));
        Storage::disk('public')->assertExists($response->json('image_path'));
    }

    public function test_inspiration_can_be_created_with_all_fields_and_whitespace_is_trimmed(): void
    {
        Storage::fake('public');
        [$user, $project] = $this->projectForUser();

        $response = $this->actingAs($user)->post(
            "/api/projects/{$project->id}/inspirations",
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
        $this->assertStringStartsWith('project-inspirations/', $response->json('image_path'));
        Storage::disk('public')->assertExists($response->json('image_path'));
    }

    public function test_completely_empty_inspiration_is_rejected(): void
    {
        [$user, $project] = $this->projectForUser();

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/inspirations", [
                'title' => '   ',
                'content' => " \n ",
                'source' => '   ',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('inspiration');

        $this->assertDatabaseCount('project_inspirations', 0);

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/inspirations", ['source' => 'Samo źródło'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('inspiration');
    }

    public function test_text_limits_and_invalid_files_are_rejected(): void
    {
        [$user, $project] = $this->projectForUser();

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/inspirations", ['title' => str_repeat('a', 121)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/inspirations", ['content' => str_repeat('a', 10001)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('content');

        $this->actingAs($user)
            ->postJson("/api/projects/{$project->id}/inspirations", [
                'title' => 'Źródło',
                'source' => str_repeat('a', 501),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('source');

        $this->actingAs($user)->post(
            "/api/projects/{$project->id}/inspirations",
            [
                'title' => 'Plik',
                'image' => UploadedFile::fake()->create('script.svg', 10, 'image/svg+xml'),
            ],
            ['Accept' => 'application/json']
        )->assertUnprocessable()->assertJsonValidationErrors('image');

        $this->actingAs($user)->post(
            "/api/projects/{$project->id}/inspirations",
            [
                'title' => 'Za duży plik',
                'image' => UploadedFile::fake()->create('large.jpg', 5121, 'image/jpeg'),
            ],
            ['Accept' => 'application/json']
        )->assertUnprocessable()->assertJsonValidationErrors('image');
    }

    public function test_inspiration_can_be_updated_and_fields_can_be_added_later(): void
    {
        Storage::fake('public');
        [$user, $project] = $this->projectForUser();
        $inspiration = ProjectInspiration::create([
            'project_id' => $project->id,
            'title' => 'Zalążek',
        ]);

        $response = $this->actingAs($user)->post(
            "/api/project-inspirations/{$inspiration->id}",
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
        $oldPath = $this->fakeImage('old.png')->store('project-inspirations', 'public');
        $inspiration = ProjectInspiration::create([
            'project_id' => $project->id,
            'image_path' => $oldPath,
        ]);

        $this->actingAs($user)
            ->post("/api/project-inspirations/{$inspiration->id}", [
                '_method' => 'PATCH',
                'title' => '   ',
                'content' => '   ',
            ], ['Accept' => 'application/json'])
            ->assertOk();

        $response = $this->actingAs($user)->post(
            "/api/project-inspirations/{$inspiration->id}",
            [
                '_method' => 'PATCH',
                'image' => $this->fakeImage('new.png'),
            ],
            ['Accept' => 'application/json']
        );

        $response->assertOk();
        $this->assertStringStartsWith('project-inspirations/', $response->json('image_path'));
        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($response->json('image_path'));
    }

    public function test_removing_the_last_non_empty_field_is_rejected(): void
    {
        Storage::fake('public');
        [$user, $project] = $this->projectForUser();
        $path = $this->fakeImage('only.png')->store('project-inspirations', 'public');
        $inspiration = ProjectInspiration::create([
            'project_id' => $project->id,
            'image_path' => $path,
        ]);

        $this->actingAs($user)
            ->post("/api/project-inspirations/{$inspiration->id}", [
                '_method' => 'PATCH',
                'remove_image' => '1',
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('inspiration');

        Storage::disk('public')->assertExists($path);
    }

    public function test_deleting_inspiration_also_deletes_its_image(): void
    {
        Storage::fake('public');
        [$user, $project] = $this->projectForUser();
        $path = $this->fakeImage('delete.png')->store('project-inspirations', 'public');
        $inspiration = ProjectInspiration::create([
            'project_id' => $project->id,
            'title' => 'Do usunięcia',
            'image_path' => $path,
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/project-inspirations/{$inspiration->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('project_inspirations', ['id' => $inspiration->id]);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_deleting_project_deletes_its_inspirations_and_images_but_not_other_project_images(): void
    {
        Storage::fake('public');
        [$user, $project] = $this->projectForUser();
        $otherProject = Project::create([
            'user_id' => $user->id,
            'name' => 'Inny projekt '.fake()->uuid(),
        ]);
        $firstPath = $this->fakeImage('first.png')->store('project-inspirations', 'public');
        $secondPath = $this->fakeImage('second.png')->store('project-inspirations', 'public');
        $otherPath = $this->fakeImage('other.png')->store('project-inspirations', 'public');

        ProjectInspiration::create([
            'project_id' => $project->id,
            'title' => 'Pierwsza',
            'image_path' => $firstPath,
        ]);
        ProjectInspiration::create([
            'project_id' => $project->id,
            'content' => 'Inspiracja bez obrazu.',
        ]);
        ProjectInspiration::create([
            'project_id' => $project->id,
            'title' => 'Druga',
            'image_path' => $secondPath,
        ]);
        $otherInspiration = ProjectInspiration::create([
            'project_id' => $otherProject->id,
            'title' => 'Inspiracja innego projektu',
            'image_path' => $otherPath,
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/projects/{$project->id}")
            ->assertOk();

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseMissing('project_inspirations', ['project_id' => $project->id]);
        $this->assertDatabaseHas('project_inspirations', [
            'id' => $otherInspiration->id,
            'project_id' => $otherProject->id,
            'image_path' => $otherPath,
        ]);
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertMissing($secondPath);
        Storage::disk('public')->assertExists($otherPath);
    }

    public function test_guest_cannot_use_inspiration_endpoints(): void
    {
        [, $project] = $this->projectForUser();
        $inspiration = ProjectInspiration::create([
            'project_id' => $project->id,
            'title' => 'Prywatna inspiracja',
        ]);

        $this->getJson("/api/projects/{$project->id}/inspirations")->assertUnauthorized();
        $this->postJson("/api/projects/{$project->id}/inspirations", ['title' => 'Nowa'])->assertUnauthorized();
        $this->getJson("/api/project-inspirations/{$inspiration->id}")->assertUnauthorized();
        $this->patchJson("/api/project-inspirations/{$inspiration->id}", ['title' => 'Zmiana'])->assertUnauthorized();
        $this->deleteJson("/api/project-inspirations/{$inspiration->id}")->assertUnauthorized();
    }

    public function test_other_user_gets_not_found_for_project_inspirations(): void
    {
        [$owner, $project] = $this->projectForUser();
        $otherUser = User::factory()->create();
        $inspiration = ProjectInspiration::create([
            'project_id' => $project->id,
            'title' => 'Prywatna inspiracja',
        ]);

        $this->actingAs($otherUser)->getJson("/api/projects/{$project->id}/inspirations")->assertNotFound();
        $this->actingAs($otherUser)
            ->postJson("/api/projects/{$project->id}/inspirations", ['title' => 'Wstrzyknięcie'])
            ->assertNotFound();
        $this->actingAs($otherUser)->getJson("/api/project-inspirations/{$inspiration->id}")->assertNotFound();
        $this->actingAs($otherUser)
            ->patchJson("/api/project-inspirations/{$inspiration->id}", [
                'title' => 'Zmiana',
                'source' => 'https://example.com/cudze-zrodlo',
            ])
            ->assertNotFound();
        $this->actingAs($otherUser)->deleteJson("/api/project-inspirations/{$inspiration->id}")->assertNotFound();

        $this->assertDatabaseHas('project_inspirations', [
            'id' => $inspiration->id,
            'project_id' => $project->id,
            'title' => 'Prywatna inspiracja',
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
