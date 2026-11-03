<?php

namespace Tests\Feature;

use App\Models\Chapter;
use App\Models\Character;
use App\Models\Event;
use App\Models\Project;
use App\Models\ProjectInspiration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_character_and_chapter_accept_supported_images(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $projectResponse = $this->actingAs($user)->post('/api/projects', [
            'name' => 'Projekt obrazów',
            'project_image' => $this->fakePng('project.png'),
        ], ['Accept' => 'application/json']);

        $projectResponse->assertCreated();
        $project = Project::findOrFail($projectResponse->json('id'));
        $this->assertStringStartsWith('projects/', $project->project_image);
        Storage::disk('public')->assertExists($project->project_image);

        $characterResponse = $this->actingAs($user)->post('/api/characters', [
            'project_id' => $project->id,
            'name' => 'Postać z obrazem',
            'character_image' => $this->fakePng('character.png'),
        ], ['Accept' => 'application/json']);

        $characterResponse->assertCreated();
        $character = Character::findOrFail($characterResponse->json('id'));
        $this->assertStringStartsWith('characters/', $character->character_image);
        Storage::disk('public')->assertExists($character->character_image);

        $chapterResponse = $this->actingAs($user)->post('/api/chapters', [
            'project_id' => $project->id,
            'chapter_number' => 1,
            'name' => 'Rozdział z obrazem',
            'chapter_image' => $this->fakePng('chapter.png'),
        ], ['Accept' => 'application/json']);

        $chapterResponse->assertCreated();
        $chapter = Chapter::findOrFail($chapterResponse->json('id'));
        $this->assertStringStartsWith('chapters/', $chapter->chapter_image);
        Storage::disk('public')->assertExists($chapter->chapter_image);
    }

    public function test_active_uploads_reject_svg_gif_bmp_and_files_over_five_megabytes(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->project($user, 'Formaty');

        $this->actingAs($user)->post('/api/projects', [
            'name' => 'Projekt GIF',
            'project_image' => $this->fakeGif('cover.gif'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('project_image');

        $this->actingAs($user)->post('/api/characters', [
            'project_id' => $project->id,
            'name' => 'Postać BMP',
            'character_image' => $this->fakeBmp('portrait.bmp'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('character_image');

        $this->actingAs($user)->post('/api/chapters', [
            'project_id' => $project->id,
            'chapter_number' => 1,
            'name' => 'Rozdział SVG',
            'chapter_image' => UploadedFile::fake()->createWithContent(
                'chapter.svg',
                '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>'
            ),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('chapter_image');

        $this->actingAs($user)->post('/api/projects', [
            'name' => 'Za duży obraz',
            'project_image' => $this->fakeOversizedPng('large.png'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('project_image');

        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_updates_without_new_files_preserve_existing_images(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->project($user, 'Bez zmian obrazu', 'projects/original.png');
        $character = $this->character($project, 'Postać', 'characters/original.png');
        $chapter = $this->chapter($project, 'Rozdział', 'chapters/original.png');
        $this->putStoredFiles([
            $project->project_image,
            $character->character_image,
            $chapter->chapter_image,
        ]);

        $this->actingAs($user)->putJson("/api/projects/{$project->id}", [
            'name' => 'Projekt po zmianie',
        ])->assertOk();
        $this->actingAs($user)->putJson("/api/characters/{$character->id}", [
            'name' => 'Postać po zmianie',
        ])->assertOk();
        $this->actingAs($user)->putJson("/api/chapters/{$chapter->id}", [
            'project_id' => $project->id,
            'chapter_number' => 1,
            'name' => 'Rozdział po zmianie',
        ])->assertOk();

        $this->assertSame('projects/original.png', $project->refresh()->project_image);
        $this->assertSame('characters/original.png', $character->refresh()->character_image);
        $this->assertSame('chapters/original.png', $chapter->refresh()->chapter_image);
        Storage::disk('public')->assertExists('projects/original.png');
        Storage::disk('public')->assertExists('characters/original.png');
        Storage::disk('public')->assertExists('chapters/original.png');
    }

    public function test_replacing_images_removes_old_files_after_successful_updates(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->project($user, 'Zastępowanie', 'projects/old.png');
        $character = $this->character($project, 'Postać', 'characters/old.png');
        $chapter = $this->chapter($project, 'Rozdział', 'chapters/old.png');
        $this->putStoredFiles([
            $project->project_image,
            $character->character_image,
            $chapter->chapter_image,
        ]);

        $projectResponse = $this->actingAs($user)->post("/api/projects/{$project->id}", [
            '_method' => 'PUT',
            'name' => $project->name,
            'project_image' => $this->fakePng('new-project.png'),
        ], ['Accept' => 'application/json'])->assertOk();
        $characterResponse = $this->actingAs($user)->post("/api/characters/{$character->id}", [
            '_method' => 'PUT',
            'name' => $character->name,
            'character_image' => $this->fakePng('new-character.png'),
        ], ['Accept' => 'application/json'])->assertOk();
        $chapterResponse = $this->actingAs($user)->post("/api/chapters/{$chapter->id}", [
            '_method' => 'PUT',
            'project_id' => $project->id,
            'chapter_number' => 1,
            'name' => $chapter->name,
            'chapter_image' => $this->fakePng('new-chapter.png'),
        ], ['Accept' => 'application/json'])->assertOk();

        Storage::disk('public')->assertMissing('projects/old.png');
        Storage::disk('public')->assertMissing('characters/old.png');
        Storage::disk('public')->assertMissing('chapters/old.png');
        Storage::disk('public')->assertExists($projectResponse->json('project_image'));
        Storage::disk('public')->assertExists($characterResponse->json('character_image'));
        Storage::disk('public')->assertExists($chapterResponse->json('chapter_image'));
    }

    public function test_chapter_image_can_be_removed_without_deleting_the_chapter(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->project($user, 'Usuwanie obrazu');
        $chapter = $this->chapter($project, 'Rozdział', 'chapters/remove.png');
        $this->putStoredFiles([$chapter->chapter_image]);

        $this->actingAs($user)->putJson("/api/chapters/{$chapter->id}", [
            'project_id' => $project->id,
            'chapter_number' => 1,
            'name' => $chapter->name,
            'remove_image' => true,
        ])->assertOk()->assertJsonPath('chapter_image', null);

        $this->assertDatabaseHas('chapters', ['id' => $chapter->id, 'chapter_image' => null]);
        Storage::disk('public')->assertMissing('chapters/remove.png');
    }

    public function test_deleting_character_and_chapter_removes_their_files_after_records(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->project($user, 'Usuwanie encji');
        $character = $this->character($project, 'Postać', 'characters/delete.png');
        $chapter = $this->chapter($project, 'Rozdział', 'chapters/delete.png');
        $this->putStoredFiles([$character->character_image, $chapter->chapter_image]);

        $this->actingAs($user)->deleteJson("/api/characters/{$character->id}")->assertOk();
        $this->actingAs($user)->deleteJson("/api/chapters/{$chapter->id}")->assertOk();

        $this->assertDatabaseMissing('characters', ['id' => $character->id]);
        $this->assertDatabaseMissing('chapters', ['id' => $chapter->id]);
        Storage::disk('public')->assertMissing('characters/delete.png');
        Storage::disk('public')->assertMissing('chapters/delete.png');
    }

    public function test_deleting_project_removes_all_its_images_and_preserves_other_project_files(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->project($user, 'Usuwany projekt', 'projects/delete.png');
        $otherProject = $this->project($user, 'Pozostający projekt', 'projects/keep.png');
        $character = $this->character($project, 'Postać', 'characters/delete.png');
        $chapter = $this->chapter($project, 'Rozdział', 'chapters/delete.png');
        $inspiration = ProjectInspiration::create([
            'project_id' => $project->id,
            'title' => 'Inspiracja',
            'image_path' => 'project-inspirations/delete.png',
        ]);
        $event = Event::create([
            'project_id' => $project->id,
            'name' => 'Wydarzenie',
            'event_image' => 'events/delete.png',
        ]);
        $otherCharacter = $this->character($otherProject, 'Inna postać', 'characters/keep.png');
        $this->putStoredFiles([
            $project->project_image,
            $character->character_image,
            $chapter->chapter_image,
            $inspiration->image_path,
            $event->event_image,
            $otherProject->project_image,
            $otherCharacter->character_image,
        ]);

        $this->actingAs($user)->deleteJson("/api/projects/{$project->id}")->assertOk();

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseMissing('characters', ['id' => $character->id]);
        $this->assertDatabaseMissing('chapters', ['id' => $chapter->id]);
        $this->assertDatabaseMissing('project_inspirations', ['id' => $inspiration->id]);
        $this->assertDatabaseMissing('events', ['id' => $event->id]);
        Storage::disk('public')->assertMissing('projects/delete.png');
        Storage::disk('public')->assertMissing('characters/delete.png');
        Storage::disk('public')->assertMissing('chapters/delete.png');
        Storage::disk('public')->assertMissing('project-inspirations/delete.png');
        Storage::disk('public')->assertMissing('events/delete.png');
        Storage::disk('public')->assertExists('projects/keep.png');
        Storage::disk('public')->assertExists('characters/keep.png');
    }

    public function test_failed_database_writes_clean_new_files_and_preserve_old_images(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        DB::statement("CREATE TRIGGER fail_project_insert BEFORE INSERT ON projects BEGIN SELECT RAISE(ABORT, 'forced insert failure'); END");

        $this->actingAs($user)->post('/api/projects', [
            'name' => 'Niezapisany projekt',
            'project_image' => $this->fakePng('new.png'),
        ], ['Accept' => 'application/json'])->assertServerError();

        $this->assertSame([], Storage::disk('public')->allFiles('projects'));
        DB::statement('DROP TRIGGER fail_project_insert');

        $project = $this->project($user, 'Istniejący projekt', 'projects/old.png');
        $this->putStoredFiles([$project->project_image]);
        DB::statement("CREATE TRIGGER fail_project_update BEFORE UPDATE ON projects BEGIN SELECT RAISE(ABORT, 'forced update failure'); END");

        $this->actingAs($user)->post("/api/projects/{$project->id}", [
            '_method' => 'PUT',
            'name' => 'Nieudana zmiana',
            'project_image' => $this->fakePng('replacement.png'),
        ], ['Accept' => 'application/json'])->assertServerError();

        $this->assertSame('projects/old.png', $project->fresh()->project_image);
        Storage::disk('public')->assertExists('projects/old.png');
        $this->assertSame(['projects/old.png'], Storage::disk('public')->allFiles('projects'));
    }

    public function test_guest_is_unauthorized_and_other_user_cannot_replace_an_image(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $project = $this->project($owner, 'Prywatny projekt', 'projects/private.png');
        $this->putStoredFiles([$project->project_image]);

        $this->post('/api/projects', [
            'name' => 'Gość',
            'project_image' => $this->fakePng('guest.png'),
        ], ['Accept' => 'application/json'])->assertUnauthorized();

        $this->actingAs($other)->post("/api/projects/{$project->id}", [
            '_method' => 'PUT',
            'name' => 'Cudza zmiana',
            'project_image' => $this->fakePng('foreign.png'),
        ], ['Accept' => 'application/json'])->assertNotFound();

        $this->assertSame('projects/private.png', $project->fresh()->project_image);
        Storage::disk('public')->assertExists('projects/private.png');
        $this->assertSame(['projects/private.png'], Storage::disk('public')->allFiles('projects'));
    }

    private function project(User $user, string $name, ?string $imagePath = null): Project
    {
        return Project::create([
            'user_id' => $user->id,
            'name' => $name,
            'project_image' => $imagePath,
        ]);
    }

    private function character(Project $project, string $name, ?string $imagePath = null): Character
    {
        return Character::create([
            'project_id' => $project->id,
            'name' => $name,
            'character_image' => $imagePath,
        ]);
    }

    private function chapter(Project $project, string $name, ?string $imagePath = null): Chapter
    {
        return Chapter::create([
            'project_id' => $project->id,
            'chapter_number' => 1,
            'sort_order' => 1,
            'is_in_manuscript' => true,
            'name' => $name,
            'chapter_image' => $imagePath,
        ]);
    }

    /** @param array<int, string|null> $paths */
    private function putStoredFiles(array $paths): void
    {
        foreach (array_filter($paths) as $path) {
            Storage::disk('public')->put($path, 'image');
        }
    }

    private function fakePng(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8xkAAAAASUVORK5CYII=', true)
        );
    }

    private function fakeGif(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', true)
        );
    }

    private function fakeOversizedPng(string $name): UploadedFile
    {
        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8xkAAAAASUVORK5CYII=',
            true
        );

        return UploadedFile::fake()->createWithContent(
            $name,
            $png.str_repeat("\0", (5 * 1024 * 1024) + 1)
        );
    }

    private function fakeBmp(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            hex2bin('424d3a0000000000000036000000280000000100000001000000010018000000000004000000130b0000130b000000000000000000000000ff00')
        );
    }
}
