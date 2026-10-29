<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectInspiration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProjectInspirationMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_creates_complete_inspiration_schema_and_can_be_rolled_back(): void
    {
        $migration = require database_path(
            'migrations/2026_10_27_000000_create_project_inspirations_table.php'
        );

        $migration->down();

        try {
            $this->assertFalse(Schema::hasTable('project_inspirations'));

            $migration->up();

            $this->assertTrue(Schema::hasTable('project_inspirations'));
            $this->assertTrue(Schema::hasColumns('project_inspirations', [
                'id',
                'project_id',
                'title',
                'content',
                'source',
                'image_path',
                'created_at',
                'updated_at',
            ]));

            $user = User::factory()->create();
            $project = Project::create([
                'user_id' => $user->id,
                'name' => 'Projekt migracji',
            ]);
            $inspiration = ProjectInspiration::create([
                'project_id' => $project->id,
                'title' => 'Inspiracja',
                'content' => 'Treść inspiracji',
                'source' => 'https://example.com/source',
                'image_path' => 'project-inspirations/image.png',
            ]);

            $this->assertTrue(
                $project->fresh()->projectInspirations()->whereKey($inspiration->id)->exists()
            );

            $migration->down();

            $this->assertFalse(Schema::hasTable('project_inspirations'));
        } finally {
            if (! Schema::hasTable('project_inspirations')) {
                $migration->up();
            }
        }
    }
}
