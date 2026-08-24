<?php

namespace Tests\Feature;

use App\Models\Chapter;
use App\Models\Character;
use App\Models\CharacterRelationship;
use App\Models\Project;
use App\Models\ProjectAttribute;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DomainAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_use_domain_endpoints(): void
    {
        $requests = [
            ['GET', '/api/projects'],
            ['POST', '/api/projects'],
            ['GET', '/api/projects/1'],
            ['PUT', '/api/projects/1'],
            ['DELETE', '/api/projects/1'],
            ['GET', '/api/chapters'],
            ['POST', '/api/chapters'],
            ['GET', '/api/chapters/1/chapters'],
            ['GET', '/api/chapters/1'],
            ['PUT', '/api/chapters/1'],
            ['DELETE', '/api/chapters/1'],
            ['POST', '/api/chapters/1/swap'],
            ['GET', '/api/characters'],
            ['POST', '/api/characters'],
            ['GET', '/api/projects/1/characters'],
            ['GET', '/api/projects/1/characters/1'],
            ['GET', '/api/characters/1'],
            ['PUT', '/api/characters/1'],
            ['DELETE', '/api/characters/1'],
            ['GET', '/api/project-attributes'],
            ['POST', '/api/project-attributes'],
            ['GET', '/api/projects/1/attributes'],
            ['PUT', '/api/project-attributes/1'],
            ['DELETE', '/api/project-attributes/1'],
            ['GET', '/api/projects/1/character-relationships'],
            ['POST', '/api/character-relationships'],
            ['DELETE', '/api/character-relationships/1'],
        ];

        foreach ($requests as [$method, $uri]) {
            $this->json($method, $uri)->assertUnauthorized();
        }
    }

    public function test_user_sees_only_their_projects_and_new_user_sees_an_empty_list(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $newUser = User::factory()->create();
        $ownedProject = $this->project($owner, 'Owned project');
        $otherProject = $this->project($otherUser, 'Other project');

        $this->actingAs($owner)
            ->getJson('/api/projects')
            ->assertOk()
            ->assertJsonFragment(['id' => $ownedProject->id])
            ->assertJsonMissing(['id' => $otherProject->id]);

        $this->actingAs($newUser)
            ->getJson('/api/projects')
            ->assertOk()
            ->assertExactJson([]);
    }

    public function test_new_project_belongs_to_the_authenticated_user(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/projects', [
            'name' => 'New project',
            'description' => 'Description',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user_id', $user->id);
        $this->assertDatabaseHas('projects', [
            'id' => $response->json('id'),
            'user_id' => $user->id,
        ]);
    }

    public function test_owner_can_read_update_and_delete_their_project(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner, 'Owned project');

        $this->actingAs($owner)
            ->getJson("/api/projects/{$project->id}")
            ->assertOk()
            ->assertJsonPath('project.id', $project->id);

        $this->actingAs($owner)
            ->putJson("/api/projects/{$project->id}", [
                'name' => 'Updated project',
                'description' => 'Updated description',
            ])
            ->assertOk()
            ->assertJsonPath('name', 'Updated project');

        $this->actingAs($owner)
            ->deleteJson("/api/projects/{$project->id}")
            ->assertOk();
        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
    }

    public function test_other_user_gets_not_found_for_direct_project_operations(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $project = $this->project($owner, 'Private project');

        $this->actingAs($otherUser)
            ->getJson("/api/projects/{$project->id}")
            ->assertNotFound();
        $this->actingAs($otherUser)
            ->putJson("/api/projects/{$project->id}", ['name' => 'Changed'])
            ->assertNotFound();
        $this->actingAs($otherUser)
            ->deleteJson("/api/projects/{$project->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'name' => 'Private project',
        ]);
    }

    public function test_dependent_resource_lists_are_scoped_to_owned_projects(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $ownedProject = $this->project($owner, 'Owned project');
        $otherProject = $this->project($otherUser, 'Other project');

        $ownedChapter = Chapter::create($this->chapterData($ownedProject, 'Owned chapter', 1));
        $otherChapter = Chapter::create($this->chapterData($otherProject, 'Other chapter', 1));
        $ownedCharacter = Character::create($this->characterData($ownedProject, 'Owned character'));
        $ownedCharacterTwo = Character::create($this->characterData($ownedProject, 'Owned character two'));
        $otherCharacter = Character::create($this->characterData($otherProject, 'Other character'));
        $ownedAttribute = ProjectAttribute::create($this->attributeData($ownedProject, 'Owned attribute'));
        $otherAttribute = ProjectAttribute::create($this->attributeData($otherProject, 'Other attribute'));
        $ownedRelationship = CharacterRelationship::create([
            'character_1_id' => $ownedCharacter->id,
            'character_2_id' => $ownedCharacterTwo->id,
            'relation_name' => 'Friends',
        ]);
        CharacterRelationship::create([
            'character_1_id' => $otherCharacter->id,
            'character_2_id' => Character::create($this->characterData($otherProject, 'Other character two'))->id,
            'relation_name' => 'Enemies',
        ]);

        $this->actingAs($owner)
            ->getJson('/api/chapters')
            ->assertOk()
            ->assertJsonFragment(['id' => $ownedChapter->id])
            ->assertJsonMissing(['id' => $otherChapter->id]);
        $this->actingAs($owner)
            ->getJson('/api/characters')
            ->assertOk()
            ->assertJsonFragment(['id' => $ownedCharacter->id])
            ->assertJsonMissing(['id' => $otherCharacter->id]);
        $this->actingAs($owner)
            ->getJson('/api/project-attributes')
            ->assertOk()
            ->assertJsonFragment(['id' => $ownedAttribute->id])
            ->assertJsonMissing(['id' => $otherAttribute->id]);
        $this->actingAs($owner)
            ->getJson("/api/projects/{$ownedProject->id}/character-relationships")
            ->assertOk()
            ->assertJsonFragment(['id' => $ownedRelationship->id])
            ->assertJsonMissing(['relation_name' => 'Enemies']);

        $this->actingAs($owner)
            ->getJson("/api/chapters/{$otherProject->id}/chapters")
            ->assertNotFound();
        $this->actingAs($owner)
            ->getJson("/api/projects/{$otherProject->id}/characters")
            ->assertNotFound();
        $this->actingAs($owner)
            ->getJson("/api/projects/{$otherProject->id}/attributes")
            ->assertNotFound();
        $this->actingAs($owner)
            ->getJson("/api/projects/{$otherProject->id}/character-relationships")
            ->assertNotFound();

        $this->actingAs($owner)
            ->getJson("/api/projects/{$ownedProject->id}/characters/{$otherCharacter->id}")
            ->assertNotFound();
    }

    public function test_user_cannot_create_dependent_resources_in_another_users_project(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $project = $this->project($owner, 'Private project');
        $character = Character::create($this->characterData($project, 'Private character'));

        $this->actingAs($otherUser)->postJson('/api/chapters', [
            'project_id' => $project->id,
            'chapter_number' => 1,
            'name' => 'Injected chapter',
        ])->assertNotFound();

        $this->actingAs($otherUser)->postJson('/api/characters', [
            'project_id' => $project->id,
            'name' => 'Injected character',
        ])->assertNotFound();

        $this->actingAs($otherUser)->postJson('/api/project-attributes', [
            'project_id' => $project->id,
            'name' => 'Injected attribute',
            'type' => 'text',
        ])->assertNotFound();

        $otherCharacter = Character::create(
            $this->characterData($this->project($otherUser, 'Other project'), 'Other character')
        );
        $this->actingAs($otherUser)->postJson('/api/character-relationships', [
            'character_1_id' => $otherCharacter->id,
            'character_2_id' => $character->id,
            'relation_name' => 'Injected relation',
        ])->assertNotFound();

        $this->assertDatabaseMissing('chapters', ['name' => 'Injected chapter']);
        $this->assertDatabaseMissing('characters', ['name' => 'Injected character']);
        $this->assertDatabaseMissing('project_attributes', ['name' => 'Injected attribute']);
        $this->assertDatabaseMissing('character_relationships', ['relation_name' => 'Injected relation']);
    }

    public function test_other_user_cannot_read_or_modify_dependent_resources(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $project = $this->project($owner, 'Private project');
        $chapter = Chapter::create($this->chapterData($project, 'Private chapter', 1));
        $character = Character::create($this->characterData($project, 'Private character'));
        $secondCharacter = Character::create($this->characterData($project, 'Private character two'));
        $attribute = ProjectAttribute::create($this->attributeData($project, 'Private attribute'));
        $relationship = CharacterRelationship::create([
            'character_1_id' => $character->id,
            'character_2_id' => $secondCharacter->id,
            'relation_name' => 'Private relation',
        ]);

        $this->actingAs($otherUser)->getJson("/api/chapters/{$chapter->id}")->assertNotFound();
        $this->actingAs($otherUser)->putJson("/api/chapters/{$chapter->id}", [
            'project_id' => $project->id,
            'name' => 'Changed chapter',
        ])->assertNotFound();
        $this->actingAs($otherUser)->deleteJson("/api/chapters/{$chapter->id}")->assertNotFound();

        $this->actingAs($otherUser)->getJson("/api/characters/{$character->id}")->assertNotFound();
        $this->actingAs($otherUser)->putJson("/api/characters/{$character->id}", [
            'name' => 'Changed character',
        ])->assertNotFound();
        $this->actingAs($otherUser)->deleteJson("/api/characters/{$character->id}")->assertNotFound();

        $this->actingAs($otherUser)->putJson("/api/project-attributes/{$attribute->id}", [
            'name' => 'Changed attribute',
            'type' => 'number',
        ])->assertNotFound();
        $this->actingAs($otherUser)->deleteJson("/api/project-attributes/{$attribute->id}")->assertNotFound();
        $this->actingAs($otherUser)->deleteJson("/api/character-relationships/{$relationship->id}")->assertNotFound();

        $this->assertDatabaseHas('chapters', ['id' => $chapter->id, 'name' => 'Private chapter']);
        $this->assertDatabaseHas('characters', ['id' => $character->id, 'name' => 'Private character']);
        $this->assertDatabaseHas('project_attributes', ['id' => $attribute->id, 'name' => 'Private attribute']);
        $this->assertDatabaseHas('character_relationships', ['id' => $relationship->id]);
    }

    public function test_swap_relationships_and_image_mutations_respect_ownership(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $ownedProject = $this->project($owner, 'Owned project');
        $otherProject = $this->project($otherUser, 'Other project');
        $ownedChapter = Chapter::create($this->chapterData($ownedProject, 'Owned chapter', 1));
        $otherChapter = Chapter::create($this->chapterData($otherProject, 'Other chapter', 2));
        $ownedCharacter = Character::create($this->characterData($ownedProject, 'Owned character'));
        $otherCharacter = Character::create($this->characterData($otherProject, 'Other character'));
        $secondOwnedProject = $this->project($owner, 'Second owned project');
        $characterFromSecondOwnedProject = Character::create(
            $this->characterData($secondOwnedProject, 'Character from second owned project')
        );

        $this->actingAs($otherUser)
            ->postJson("/api/chapters/{$ownedChapter->id}/swap", ['direction' => 'down'])
            ->assertNotFound();
        $this->actingAs($owner)
            ->postJson("/api/chapters/{$ownedChapter->id}/swap", ['target_id' => $otherChapter->id])
            ->assertNotFound();
        $this->actingAs($owner)->postJson('/api/character-relationships', [
            'character_1_id' => $ownedCharacter->id,
            'character_2_id' => $otherCharacter->id,
            'relation_name' => 'Cross-owner relation',
        ])->assertNotFound();
        $this->actingAs($owner)->postJson('/api/character-relationships', [
            'character_1_id' => $ownedCharacter->id,
            'character_2_id' => $characterFromSecondOwnedProject->id,
            'relation_name' => 'Cross-project relation',
        ])->assertUnprocessable()->assertJsonValidationErrors('character_2_id');

        $this->actingAs($otherUser)->putJson("/api/projects/{$ownedProject->id}", [
            'name' => 'Changed project',
            'project_image' => UploadedFile::fake()->create('cover.jpg', 10, 'image/jpeg'),
        ])->assertNotFound();

        $this->assertSame(1, $ownedChapter->refresh()->chapter_number);
        $this->assertSame(2, $otherChapter->refresh()->chapter_number);
        $this->assertDatabaseMissing('character_relationships', ['relation_name' => 'Cross-owner relation']);
        $this->assertDatabaseMissing('character_relationships', ['relation_name' => 'Cross-project relation']);
        Storage::disk('public')->assertMissing('projects/cover.jpg');
    }

    public function test_project_id_tampering_does_not_move_a_resource_to_another_users_project(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $ownedProject = $this->project($owner, 'Owned project');
        $otherProject = $this->project($otherUser, 'Other project');
        $chapter = Chapter::create($this->chapterData($ownedProject, 'Owned chapter', 1));

        $this->actingAs($owner)->putJson("/api/chapters/{$chapter->id}", [
            'project_id' => $otherProject->id,
            'chapter_number' => 1,
            'name' => 'Moved chapter',
        ])->assertNotFound();

        $this->assertDatabaseHas('chapters', [
            'id' => $chapter->id,
            'project_id' => $ownedProject->id,
            'name' => 'Owned chapter',
        ]);
    }

    public function test_owner_can_create_modify_and_use_special_operations_on_dependent_resources(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner, 'Owned project');

        $firstChapterResponse = $this->actingAs($owner)->postJson('/api/chapters', [
            'project_id' => $project->id,
            'chapter_number' => 1,
            'name' => 'First chapter',
        ])->assertCreated();
        $secondChapterResponse = $this->actingAs($owner)->postJson('/api/chapters', [
            'project_id' => $project->id,
            'chapter_number' => 2,
            'name' => 'Second chapter',
        ])->assertCreated();
        $firstChapterId = $firstChapterResponse->json('id');
        $secondChapterId = $secondChapterResponse->json('id');

        $firstCharacterResponse = $this->actingAs($owner)->postJson('/api/characters', [
            'project_id' => $project->id,
            'name' => 'First character',
        ])->assertCreated();
        $secondCharacterResponse = $this->actingAs($owner)->postJson('/api/characters', [
            'project_id' => $project->id,
            'name' => 'Second character',
        ])->assertCreated();
        $firstCharacterId = $firstCharacterResponse->json('id');
        $secondCharacterId = $secondCharacterResponse->json('id');

        $attributeResponse = $this->actingAs($owner)->postJson('/api/project-attributes', [
            'project_id' => $project->id,
            'name' => 'Age',
            'type' => 'number',
        ])->assertCreated();
        $attributeId = $attributeResponse->json('id');

        $relationshipResponse = $this->actingAs($owner)->postJson('/api/character-relationships', [
            'character_1_id' => $firstCharacterId,
            'character_2_id' => $secondCharacterId,
            'relation_name' => 'Friends',
        ])->assertCreated();

        $this->actingAs($owner)->getJson(
            "/api/projects/{$project->id}/characters/{$firstCharacterId}"
        )->assertOk()->assertJsonPath('character.id', $firstCharacterId);
        $this->actingAs($owner)->putJson("/api/chapters/{$firstChapterId}", [
            'project_id' => $project->id,
            'chapter_number' => 1,
            'name' => 'Updated first chapter',
        ])->assertOk();
        $this->actingAs($owner)->putJson("/api/characters/{$firstCharacterId}", [
            'name' => 'Updated first character',
        ])->assertOk();
        $this->actingAs($owner)->putJson("/api/project-attributes/{$attributeId}", [
            'name' => 'Updated age',
            'type' => 'number',
        ])->assertOk();
        $this->actingAs($owner)->postJson("/api/chapters/{$firstChapterId}/swap", [
            'target_id' => $secondChapterId,
        ])->assertOk();

        $this->assertDatabaseHas('chapters', [
            'id' => $firstChapterId,
            'chapter_number' => 2,
            'name' => 'Updated first chapter',
        ]);
        $this->assertDatabaseHas('chapters', [
            'id' => $secondChapterId,
            'chapter_number' => 1,
        ]);
        $this->assertDatabaseHas('characters', [
            'id' => $firstCharacterId,
            'name' => 'Updated first character',
        ]);
        $this->assertDatabaseHas('project_attributes', [
            'id' => $attributeId,
            'name' => 'Updated age',
        ]);

        $this->actingAs($owner)
            ->deleteJson('/api/character-relationships/'.$relationshipResponse->json('id'))
            ->assertOk();
    }

    private function project(User $user, string $name): Project
    {
        return Project::create([
            'user_id' => $user->id,
            'name' => $name,
        ]);
    }

    /** @return array<string, int|string> */
    private function chapterData(Project $project, string $name, int $number): array
    {
        return [
            'project_id' => $project->id,
            'chapter_number' => $number,
            'name' => $name,
        ];
    }

    /** @return array<string, int|string> */
    private function characterData(Project $project, string $name): array
    {
        return [
            'project_id' => $project->id,
            'name' => $name,
        ];
    }

    /** @return array<string, int|string> */
    private function attributeData(Project $project, string $name): array
    {
        return [
            'project_id' => $project->id,
            'name' => $name,
            'type' => 'text',
        ];
    }
}
