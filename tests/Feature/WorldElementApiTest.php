<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use App\Models\WorldElement;
use App\Models\WorldElementCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WorldElementApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_use_world_element_endpoints(): void
    {
        $owner = User::factory()->create();
        $project = $this->projectFor($owner);
        $category = $this->categoryFor($project);
        $element = $this->elementFor($category);

        $this->getJson("/api/world-element-categories/{$category->id}/world-elements")
            ->assertUnauthorized();
        $this->postJson("/api/world-element-categories/{$category->id}/world-elements", ['name' => 'Las'])
            ->assertUnauthorized();
        $this->getJson("/api/world-elements/{$element->id}")->assertUnauthorized();
        $this->patchJson("/api/world-elements/{$element->id}", ['name' => 'Las'])
            ->assertUnauthorized();
        $this->deleteJson("/api/world-elements/{$element->id}")->assertUnauthorized();
    }

    public function test_list_is_category_scoped_and_sorted_case_insensitively(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);
        $otherCategory = $this->categoryFor($project, 'Przedmioty');

        $this->actingAs($user)
            ->getJson("/api/world-element-categories/{$category->id}/world-elements")
            ->assertOk()
            ->assertExactJson([]);

        $zeta = $this->elementFor($category, 'zeta');
        $alpha = $this->elementFor($category, 'Alpha');
        $beta = $this->elementFor($category, 'beta');
        $other = $this->elementFor($otherCategory, 'Amulet');

        $this->actingAs($user)
            ->getJson("/api/world-element-categories/{$category->id}/world-elements")
            ->assertOk()
            ->assertJsonCount(3)
            ->assertJsonPath('0.id', $alpha->id)
            ->assertJsonPath('1.id', $beta->id)
            ->assertJsonPath('2.id', $zeta->id)
            ->assertJsonMissing(['id' => $other->id]);
    }

    public function test_search_is_trimmed_case_insensitive_and_matches_name_or_description(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);
        $otherCategory = $this->categoryFor($project, 'Przedmioty');
        $forest = $this->elementFor($category, 'Las Zguby', 'Leśne drzewa');
        $tower = $this->elementFor($category, 'Wieża', 'Siedziba LEŚNEJ wiedźmy');
        $this->elementFor($category, 'Miasto', 'Kamienne mury');
        $outside = $this->elementFor($otherCategory, 'Leśny amulet', 'Poza kategorią');

        $this->actingAs($user)
            ->getJson("/api/world-element-categories/{$category->id}/world-elements?search=%20leś%20")
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['id' => $forest->id])
            ->assertJsonFragment(['id' => $tower->id])
            ->assertJsonMissing(['id' => $outside->id]);

        $this->actingAs($user)
            ->getJson("/api/world-element-categories/{$category->id}/world-elements?search=%20%20")
            ->assertOk()
            ->assertJsonCount(3);

        $this->actingAs($user)
            ->getJson("/api/world-element-categories/{$category->id}/world-elements?search=".str_repeat('a', 129))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('search');
    }

    public function test_owner_can_create_element_and_system_fields_are_ignored(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);
        $otherCategory = $this->categoryFor($project, 'Magia');

        $response = $this->actingAs($user)->postJson(
            "/api/world-element-categories/{$category->id}/world-elements",
            [
                'name' => '  Poznań  ',
                'description' => '  Miasto bohatera  ',
                'world_element_category_id' => $otherCategory->id,
                'image_path' => 'world-elements/podsunięty.png',
                'project_id' => 999,
                'user_id' => 999,
            ]
        );

        $response
            ->assertCreated()
            ->assertJsonPath('name', 'Poznań')
            ->assertJsonPath('description', 'Miasto bohatera')
            ->assertJsonPath('world_element_category_id', $category->id)
            ->assertJsonPath('image_path', null);
        $this->assertDatabaseHas('world_elements', [
            'id' => $response->json('id'),
            'world_element_category_id' => $category->id,
            'name' => 'Poznań',
        ]);
    }

    public function test_create_validates_fields_normalizes_empty_description_and_allows_duplicate_names(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);
        $endpoint = "/api/world-element-categories/{$category->id}/world-elements";

        $this->actingAs($user)->postJson($endpoint, [])
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->actingAs($user)->postJson($endpoint, ['name' => '   '])
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->actingAs($user)->postJson($endpoint, ['name' => str_repeat('a', 129)])
            ->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->actingAs($user)->postJson($endpoint, [
            'name' => 'Las',
            'description' => str_repeat('a', 20001),
        ])->assertUnprocessable()->assertJsonValidationErrors('description');

        $first = $this->actingAs($user)->postJson($endpoint, [
            'name' => 'Las',
            'description' => '   ',
        ])->assertCreated()->assertJsonPath('description', null);
        $second = $this->actingAs($user)->postJson($endpoint, ['name' => 'Las'])
            ->assertCreated();

        $this->assertNotSame($first->json('id'), $second->json('id'));
    }

    public function test_create_accepts_jpeg_png_and_webp_images(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $category = $this->categoryFor($this->projectFor($user));
        $files = [
            'jpeg' => $this->fakeJpeg('photo.jpeg'),
            'png' => $this->fakePng('photo.png'),
            'webp' => $this->fakeWebp('photo.webp'),
        ];

        foreach ($files as $name => $file) {
            $response = $this->actingAs($user)->post(
                "/api/world-element-categories/{$category->id}/world-elements",
                ['name' => strtoupper($name), 'image' => $file],
                ['Accept' => 'application/json']
            )->assertCreated();

            $this->assertStringStartsWith('world-elements/', $response->json('image_path'));
            Storage::disk('public')->assertExists($response->json('image_path'));
        }
    }

    public function test_create_rejects_gif_bmp_svg_and_oversized_images(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $category = $this->categoryFor($this->projectFor($user));
        $files = [
            $this->fakeGif('image.gif'),
            $this->fakeBmp('image.bmp'),
            UploadedFile::fake()->createWithContent(
                'image.svg',
                '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>'
            ),
            $this->fakeOversizedPng('image.png'),
        ];

        foreach ($files as $index => $file) {
            $this->actingAs($user)->post(
                "/api/world-element-categories/{$category->id}/world-elements",
                ['name' => "Obraz {$index}", 'image' => $file],
                ['Accept' => 'application/json']
            )->assertUnprocessable()->assertJsonValidationErrors('image');
        }

        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertDatabaseCount('world_elements', 0);
    }

    public function test_other_user_gets_not_found_for_category_and_element_operations(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $category = $this->categoryFor($this->projectFor($owner));
        $element = $this->elementFor($category);

        $this->actingAs($other)
            ->getJson("/api/world-element-categories/{$category->id}/world-elements")
            ->assertNotFound();
        $this->actingAs($other)
            ->postJson("/api/world-element-categories/{$category->id}/world-elements", ['name' => 'Cudzy'])
            ->assertNotFound();
        $this->actingAs($other)->getJson("/api/world-elements/{$element->id}")
            ->assertNotFound();
        $this->actingAs($other)->patchJson("/api/world-elements/{$element->id}", ['name' => 'Cudzy'])
            ->assertNotFound();
        $this->actingAs($other)->deleteJson("/api/world-elements/{$element->id}")
            ->assertNotFound();
    }

    public function test_owner_can_show_and_partially_update_element_without_moving_it(): void
    {
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);
        $otherCategory = $this->categoryFor($project, 'Magia');
        $element = $this->elementFor($category, 'Las', 'Stary opis', 'world-elements/old.png');

        $this->actingAs($user)->getJson("/api/world-elements/{$element->id}")
            ->assertOk()
            ->assertJsonPath('name', 'Las')
            ->assertJsonPath('description', 'Stary opis');

        $this->actingAs($user)->patchJson("/api/world-elements/{$element->id}", [
            'name' => '  Puszcza  ',
            'world_element_category_id' => $otherCategory->id,
            'image_path' => 'world-elements/injected.png',
            'project_id' => 999,
        ])
            ->assertOk()
            ->assertJsonPath('name', 'Puszcza')
            ->assertJsonPath('description', 'Stary opis')
            ->assertJsonPath('world_element_category_id', $category->id)
            ->assertJsonPath('image_path', 'world-elements/old.png');

        $this->actingAs($user)->patchJson("/api/world-elements/{$element->id}", [
            'name' => 'Bór',
            'description' => '  Nowy opis  ',
        ])
            ->assertOk()
            ->assertJsonPath('name', 'Bór')
            ->assertJsonPath('description', 'Nowy opis');

        $this->actingAs($user)->patchJson("/api/world-elements/{$element->id}", [
            'description' => '   ',
        ])->assertOk()->assertJsonPath('description', null);
    }

    public function test_update_replaces_and_removes_image_without_leaking_files(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $category = $this->categoryFor($this->projectFor($user));
        $element = $this->elementFor($category, 'Las', null, 'world-elements/old.png');
        Storage::disk('public')->put('world-elements/old.png', 'old');

        $response = $this->actingAs($user)->post("/api/world-elements/{$element->id}", [
            '_method' => 'PATCH',
            'image' => $this->fakePng('new.png'),
        ], ['Accept' => 'application/json'])->assertOk();
        $newPath = $response->json('image_path');

        Storage::disk('public')->assertMissing('world-elements/old.png');
        Storage::disk('public')->assertExists($newPath);

        $this->actingAs($user)->patchJson("/api/world-elements/{$element->id}", [
            'remove_image' => true,
        ])->assertOk()->assertJsonPath('image_path', null);

        Storage::disk('public')->assertMissing($newPath);
    }

    public function test_update_rejects_simultaneous_image_addition_and_removal(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $category = $this->categoryFor($this->projectFor($user));
        $element = $this->elementFor($category, 'Las', null, 'world-elements/old.png');
        Storage::disk('public')->put('world-elements/old.png', 'old');

        $this->actingAs($user)->post("/api/world-elements/{$element->id}", [
            '_method' => 'PATCH',
            'image' => $this->fakePng('new.png'),
            'remove_image' => true,
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('remove_image');

        $this->assertSame('world-elements/old.png', $element->fresh()->image_path);
        Storage::disk('public')->assertExists('world-elements/old.png');
        $this->assertSame(['world-elements/old.png'], Storage::disk('public')->allFiles('world-elements'));
    }

    public function test_delete_removes_record_and_image_and_updates_category_count(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->projectFor($user);
        $category = $this->categoryFor($project);
        $withImage = $this->elementFor($category, 'Las', null, 'world-elements/delete.png');
        $withoutImage = $this->elementFor($category, 'Miasto');
        Storage::disk('public')->put('world-elements/delete.png', 'image');

        $this->actingAs($user)->deleteJson("/api/world-elements/{$withImage->id}")
            ->assertNoContent();
        Storage::disk('public')->assertMissing('world-elements/delete.png');
        $this->assertDatabaseMissing('world_elements', ['id' => $withImage->id]);

        $this->actingAs($user)->deleteJson("/api/world-elements/{$withoutImage->id}")
            ->assertNoContent();
        $this->actingAs($user)
            ->getJson("/api/projects/{$project->id}/world-element-categories")
            ->assertOk()
            ->assertJsonPath('0.items_count', 0);
    }

    public function test_deleting_project_removes_its_world_element_images_only(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $project = $this->projectFor($user, 'Usuwany projekt');
        $otherProject = $this->projectFor($user, 'Pozostający projekt');
        $element = $this->elementFor(
            $this->categoryFor($project),
            'Las',
            null,
            'world-elements/delete.png'
        );
        $otherElement = $this->elementFor(
            $this->categoryFor($otherProject),
            'Miasto',
            null,
            'world-elements/keep.png'
        );
        Storage::disk('public')->put($element->image_path, 'delete');
        Storage::disk('public')->put($otherElement->image_path, 'keep');

        $this->actingAs($user)->deleteJson("/api/projects/{$project->id}")->assertOk();

        $this->assertDatabaseMissing('world_elements', ['id' => $element->id]);
        $this->assertDatabaseHas('world_elements', ['id' => $otherElement->id]);
        Storage::disk('public')->assertMissing('world-elements/delete.png');
        Storage::disk('public')->assertExists('world-elements/keep.png');
    }

    public function test_failed_database_writes_clean_new_files_and_preserve_old_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $category = $this->categoryFor($this->projectFor($user));

        DB::statement("CREATE TRIGGER fail_world_element_insert BEFORE INSERT ON world_elements BEGIN SELECT RAISE(ABORT, 'forced insert failure'); END");

        $this->actingAs($user)->post(
            "/api/world-element-categories/{$category->id}/world-elements",
            ['name' => 'Las', 'image' => $this->fakePng('new.png')],
            ['Accept' => 'application/json']
        )->assertServerError();

        $this->assertSame([], Storage::disk('public')->allFiles('world-elements'));
        DB::statement('DROP TRIGGER fail_world_element_insert');

        $element = $this->elementFor($category, 'Las', null, 'world-elements/old.png');
        Storage::disk('public')->put('world-elements/old.png', 'old');
        DB::statement("CREATE TRIGGER fail_world_element_update BEFORE UPDATE ON world_elements BEGIN SELECT RAISE(ABORT, 'forced update failure'); END");

        $this->actingAs($user)->post("/api/world-elements/{$element->id}", [
            '_method' => 'PATCH',
            'image' => $this->fakePng('replacement.png'),
        ], ['Accept' => 'application/json'])->assertServerError();

        $this->assertSame('world-elements/old.png', $element->fresh()->image_path);
        Storage::disk('public')->assertExists('world-elements/old.png');
        $this->assertSame(['world-elements/old.png'], Storage::disk('public')->allFiles('world-elements'));
    }

    private function projectFor(User $user, string $name = 'Projekt świata'): Project
    {
        return Project::create(['user_id' => $user->id, 'name' => $name]);
    }

    private function categoryFor(Project $project, string $name = 'Lokalizacje'): WorldElementCategory
    {
        return WorldElementCategory::create(['project_id' => $project->id, 'name' => $name]);
    }

    private function elementFor(
        WorldElementCategory $category,
        string $name = 'Poznań',
        ?string $description = null,
        ?string $imagePath = null,
    ): WorldElement {
        return WorldElement::create([
            'world_element_category_id' => $category->id,
            'name' => $name,
            'description' => $description,
            'image_path' => $imagePath,
        ]);
    }

    private function fakePng(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z8xkAAAAASUVORK5CYII=', true)
        );
    }

    private function fakeJpeg(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=', true)
        );
    }

    private function fakeWebp(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==', true)
        );
    }

    private function fakeGif(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', true)
        );
    }

    private function fakeBmp(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            hex2bin('424d3a0000000000000036000000280000000100000001000000010018000000000004000000130b0000130b000000000000000000000000ff00')
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
}
