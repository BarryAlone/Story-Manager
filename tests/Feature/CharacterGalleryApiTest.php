<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\CharacterGalleryImage;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CharacterGalleryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_schema_relations_order_and_character_cascade(): void
    {
        $character = $this->characterFor($this->projectFor(User::factory()->create()));
        $later = $this->galleryImageFor($character, 'character-gallery/later.png', 2);
        $first = $this->galleryImageFor($character, 'character-gallery/first.png', 1);
        $second = $this->galleryImageFor($character, 'character-gallery/second.png', 1);

        $this->assertTrue(Schema::hasColumns('character_gallery_images', [
            'id',
            'character_id',
            'image_path',
            'caption',
            'sort_order',
            'created_at',
            'updated_at',
        ]));
        $this->assertSame(
            [$first->id, $second->id, $later->id],
            $character->galleryImages->pluck('id')->all(),
        );
        $this->assertTrue($first->character->is($character));

        $character->delete();

        $this->assertDatabaseCount('character_gallery_images', 0);
    }

    public function test_guest_is_unauthorized_and_foreign_resources_are_hidden(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $character = $this->characterFor($this->projectFor($owner));
        $image = $this->galleryImageFor($character);

        $this->getJson("/api/characters/{$character->id}/gallery-images")->assertUnauthorized();
        $this->post("/api/characters/{$character->id}/gallery-images", [
            'image' => $this->fakePng('guest.png'),
        ], ['Accept' => 'application/json'])->assertUnauthorized();
        $this->patchJson("/api/characters/{$character->id}/gallery-images/order", [
            'image_ids' => [$image->id],
        ])->assertUnauthorized();
        $this->patchJson("/api/character-gallery-images/{$image->id}", ['caption' => 'Gość'])
            ->assertUnauthorized();
        $this->deleteJson("/api/character-gallery-images/{$image->id}")->assertUnauthorized();

        $this->actingAs($other)->getJson("/api/characters/{$character->id}/gallery-images")
            ->assertNotFound();
        $this->actingAs($other)->post("/api/characters/{$character->id}/gallery-images", [
            'image' => $this->fakePng('foreign.png'),
        ], ['Accept' => 'application/json'])->assertNotFound();
        $this->actingAs($other)->patchJson("/api/characters/{$character->id}/gallery-images/order", [
            'image_ids' => [$image->id],
        ])->assertNotFound();
        $this->actingAs($other)->patchJson("/api/character-gallery-images/{$image->id}", [
            'caption' => 'Cudza zmiana',
        ])->assertNotFound();
        $this->actingAs($other)->deleteJson("/api/character-gallery-images/{$image->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('character_gallery_images', [
            'id' => $image->id,
            'caption' => null,
        ]);
        $this->assertSame([], Storage::disk('public')->allFiles('character-gallery'));
    }

    public function test_owner_can_upload_single_images_with_caption_and_public_url(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $character = $this->characterFor($this->projectFor($user));

        $firstResponse = $this->actingAs($user)->post("/api/characters/{$character->id}/gallery-images", [
            'image' => $this->fakePng('first.png'),
            'caption' => '  Pierwszy portret  ',
        ], ['Accept' => 'application/json']);

        $firstResponse
            ->assertCreated()
            ->assertJsonPath('character_id', $character->id)
            ->assertJsonPath('caption', 'Pierwszy portret')
            ->assertJsonPath('sort_order', 0)
            ->assertJsonMissingPath('image_path');
        $this->assertStringContainsString(
            '/storage/character-gallery/',
            $firstResponse->json('image_url'),
        );

        $secondResponse = $this->actingAs($user)->post("/api/characters/{$character->id}/gallery-images", [
            'image' => $this->fakePng('second.png'),
            'caption' => '   ',
        ], ['Accept' => 'application/json']);

        $secondResponse
            ->assertCreated()
            ->assertJsonPath('caption', null)
            ->assertJsonPath('sort_order', 1);

        $first = CharacterGalleryImage::findOrFail($firstResponse->json('id'));
        $second = CharacterGalleryImage::findOrFail($secondResponse->json('id'));
        Storage::disk('public')->assertExists($first->image_path);
        Storage::disk('public')->assertExists($second->image_path);
    }

    public function test_upload_validation_matches_character_portrait_rules(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $character = $this->characterFor($this->projectFor($user));
        $endpoint = "/api/characters/{$character->id}/gallery-images";

        $this->actingAs($user)->post($endpoint, [], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('image');
        $this->actingAs($user)->post($endpoint, [
            'image' => $this->fakeGif('gallery.gif'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('image');
        $this->actingAs($user)->post($endpoint, [
            'image' => $this->fakeOversizedPng('large.png'),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('image');
        $this->actingAs($user)->post($endpoint, [
            'image' => $this->fakePng('caption.png'),
            'caption' => str_repeat('a', 256),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('caption');

        $this->assertDatabaseCount('character_gallery_images', 0);
        $this->assertSame([], Storage::disk('public')->allFiles('character-gallery'));
    }

    public function test_index_is_sorted_and_does_not_expose_internal_paths(): void
    {
        $user = User::factory()->create();
        $character = $this->characterFor($this->projectFor($user));
        $later = $this->galleryImageFor($character, 'character-gallery/later.png', 4, 'Później');
        $first = $this->galleryImageFor($character, 'character-gallery/first.png', 1, 'Pierwszy');
        $second = $this->galleryImageFor($character, 'character-gallery/second.png', 1, 'Drugi');

        $response = $this->actingAs($user)
            ->getJson("/api/characters/{$character->id}/gallery-images")
            ->assertOk()
            ->assertJsonMissingPath('0.image_path');

        $this->assertSame(
            [$first->id, $second->id, $later->id],
            array_column($response->json(), 'id'),
        );
        $this->assertSame(['Pierwszy', 'Drugi', 'Później'], array_column($response->json(), 'caption'));
    }

    public function test_caption_can_be_updated_and_cleared_without_replacing_file(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $character = $this->characterFor($this->projectFor($user));
        $image = $this->galleryImageFor($character, 'character-gallery/existing.png', 0, 'Stary');
        Storage::disk('public')->put($image->image_path, 'image');

        $this->actingAs($user)->patchJson("/api/character-gallery-images/{$image->id}", [
            'caption' => '  Nowy podpis  ',
        ])
            ->assertOk()
            ->assertJsonPath('caption', 'Nowy podpis')
            ->assertJsonMissingPath('image_path');

        $this->actingAs($user)->patchJson("/api/character-gallery-images/{$image->id}", [
            'caption' => '   ',
        ])->assertOk()->assertJsonPath('caption', null);

        $this->assertSame('character-gallery/existing.png', $image->refresh()->image_path);
        Storage::disk('public')->assertExists($image->image_path);
    }

    public function test_reorder_requires_the_complete_gallery_and_updates_atomically(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $character = $this->characterFor($project);
        $otherCharacter = $this->characterFor($project, 'Inna');
        $first = $this->galleryImageFor($character, 'character-gallery/first.png', 0);
        $second = $this->galleryImageFor($character, 'character-gallery/second.png', 1);
        $third = $this->galleryImageFor($character, 'character-gallery/third.png', 2);
        $foreign = $this->galleryImageFor($otherCharacter, 'character-gallery/foreign.png', 0);
        $endpoint = "/api/characters/{$character->id}/gallery-images/order";

        $response = $this->actingAs($user)->patchJson($endpoint, [
            'image_ids' => [$third->id, $first->id, $second->id],
        ])->assertOk();

        $this->assertSame(
            [$third->id, $first->id, $second->id],
            array_column($response->json(), 'id'),
        );
        $this->assertSame([0, 1, 2], array_column($response->json(), 'sort_order'));

        foreach ([
            [$third->id, $first->id],
            [$third->id, $first->id, $first->id],
            [$third->id, $first->id, $foreign->id],
        ] as $invalidIds) {
            $this->actingAs($user)->patchJson($endpoint, ['image_ids' => $invalidIds])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('image_ids');
            $this->assertSame(
                [$third->id, $first->id, $second->id],
                $character->galleryImages()->pluck('id')->all(),
            );
        }
    }

    public function test_database_error_rolls_back_reorder(): void
    {
        $user = User::factory()->create();
        $character = $this->characterFor($this->projectFor($user));
        $first = $this->galleryImageFor($character, 'character-gallery/first.png', 0);
        $second = $this->galleryImageFor($character, 'character-gallery/second.png', 1);
        DB::statement(
            'CREATE TRIGGER fail_gallery_reorder BEFORE UPDATE OF sort_order ON character_gallery_images '
            ."WHEN NEW.id = {$first->id} BEGIN SELECT RAISE(ABORT, 'forced reorder failure'); END"
        );

        $this->actingAs($user)->patchJson("/api/characters/{$character->id}/gallery-images/order", [
            'image_ids' => [$second->id, $first->id],
        ])->assertServerError();

        $this->assertSame(0, $first->refresh()->sort_order);
        $this->assertSame(1, $second->refresh()->sort_order);
    }

    public function test_deleting_image_removes_record_and_file(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $character = $this->characterFor($this->projectFor($user));
        $image = $this->galleryImageFor($character, 'character-gallery/delete.png');
        Storage::disk('public')->put($image->image_path, 'image');

        $this->actingAs($user)->deleteJson("/api/character-gallery-images/{$image->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('character_gallery_images', ['id' => $image->id]);
        Storage::disk('public')->assertMissing('character-gallery/delete.png');
    }

    public function test_deleting_character_removes_gallery_files_and_preserves_other_character_files(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $character = $this->characterFor($project, 'Usuwana');
        $otherCharacter = $this->characterFor($project, 'Pozostająca');
        $first = $this->galleryImageFor($character, 'character-gallery/delete-first.png');
        $second = $this->galleryImageFor($character, 'character-gallery/delete-second.png', 1);
        $other = $this->galleryImageFor($otherCharacter, 'character-gallery/keep.png');
        foreach ([$first, $second, $other] as $image) {
            Storage::disk('public')->put($image->image_path, 'image');
        }

        $this->actingAs($user)->deleteJson("/api/characters/{$character->id}")->assertOk();

        $this->assertDatabaseMissing('characters', ['id' => $character->id]);
        $this->assertDatabaseMissing('character_gallery_images', ['character_id' => $character->id]);
        Storage::disk('public')->assertMissing($first->image_path);
        Storage::disk('public')->assertMissing($second->image_path);
        Storage::disk('public')->assertExists($other->image_path);
    }

    public function test_deleting_project_removes_gallery_files_and_preserves_other_project_files(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Usuwany');
        $otherProject = $this->projectFor($user, 'Pozostający');
        $image = $this->galleryImageFor(
            $this->characterFor($project),
            'character-gallery/project-delete.png',
        );
        $other = $this->galleryImageFor(
            $this->characterFor($otherProject),
            'character-gallery/project-keep.png',
        );
        Storage::disk('public')->put($image->image_path, 'image');
        Storage::disk('public')->put($other->image_path, 'image');

        $this->actingAs($user)->deleteJson("/api/projects/{$project->id}")->assertOk();

        $this->assertDatabaseMissing('character_gallery_images', ['id' => $image->id]);
        Storage::disk('public')->assertMissing($image->image_path);
        Storage::disk('public')->assertExists($other->image_path);
    }

    public function test_failed_database_insert_removes_new_file(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $character = $this->characterFor($this->projectFor($user));
        DB::statement(
            'CREATE TRIGGER fail_gallery_insert BEFORE INSERT ON character_gallery_images '
            ."BEGIN SELECT RAISE(ABORT, 'forced insert failure'); END"
        );

        $this->actingAs($user)->post("/api/characters/{$character->id}/gallery-images", [
            'image' => $this->fakePng('orphan.png'),
        ], ['Accept' => 'application/json'])->assertServerError();

        $this->assertDatabaseCount('character_gallery_images', 0);
        $this->assertSame([], Storage::disk('public')->allFiles('character-gallery'));
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

    private function galleryImageFor(
        Character $character,
        string $path = 'character-gallery/image.png',
        int $sortOrder = 0,
        ?string $caption = null,
    ): CharacterGalleryImage {
        return CharacterGalleryImage::create([
            'character_id' => $character->id,
            'image_path' => $path,
            'caption' => $caption,
            'sort_order' => $sortOrder,
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

    private function fakeGif(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', true),
        );
    }

    private function fakeOversizedPng(string $name): UploadedFile
    {
        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8xkAAAAASUVORK5CYII=',
            true,
        );

        return UploadedFile::fake()->createWithContent(
            $name,
            $png.str_repeat("\0", (5 * 1024 * 1024) + 1),
        );
    }
}
