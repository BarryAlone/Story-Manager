<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProjectTaskMigrationTest extends TestCase
{
    public function test_migration_preserves_legacy_task_data_and_can_be_rolled_back(): void
    {
        $originalConnection = config('database.default');
        $databasePath = tempnam(sys_get_temp_dir(), 'story-manager-tasks-');

        config([
            'database.default' => 'project_task_migration_test',
            'database.connections.project_task_migration_test' => [
                'driver' => 'sqlite',
                'database' => $databasePath,
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        DB::purge('project_task_migration_test');

        try {
            Schema::create('projects', function (Blueprint $table): void {
                $table->id();
            });
            Schema::create('project_notes', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('project_id')->constrained()->cascadeOnDelete();
                $table->string('title', 160);
                $table->longText('content')->nullable();
                $table->boolean('is_pinned')->default(false);
                $table->timestamps();
            });
            Schema::create('project_checklist_items', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('project_id')->constrained()->cascadeOnDelete();
                $table->string('content', 500);
                $table->timestamp('completed_at')->nullable();
                $table->date('due_date')->nullable();
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
                $table->index(['project_id', 'completed_at', 'sort_order']);
            });

            DB::table('projects')->insert(['id' => 1]);
            DB::table('project_checklist_items')->insert([
                'id' => 10,
                'project_id' => 1,
                'content' => 'Zachowane zadanie',
                'due_date' => '2026-12-31',
                'sort_order' => 3,
            ]);

            $migration = require database_path(
                'migrations/2026_11_24_000000_promote_project_checklist_items_to_tasks.php'
            );
            $migration->up();

            $this->assertFalse(Schema::hasTable('project_checklist_items'));
            $this->assertTrue(Schema::hasColumns('project_tasks', [
                'id', 'project_id', 'project_note_id', 'title', 'content',
                'completed_at', 'due_date', 'sort_order', 'created_at', 'updated_at',
            ]));
            $this->assertDatabaseHas('project_tasks', [
                'id' => 10,
                'project_id' => 1,
                'project_note_id' => null,
                'title' => 'Zachowane zadanie',
                'content' => null,
                'due_date' => '2026-12-31',
                'sort_order' => 3,
            ], 'project_task_migration_test');

            $migration->down();

            $this->assertFalse(Schema::hasTable('project_tasks'));
            $this->assertDatabaseHas('project_checklist_items', [
                'id' => 10,
                'project_id' => 1,
                'content' => 'Zachowane zadanie',
                'due_date' => '2026-12-31',
                'sort_order' => 3,
            ], 'project_task_migration_test');
        } finally {
            DB::disconnect('project_task_migration_test');
            config(['database.default' => $originalConnection]);
            DB::purge('project_task_migration_test');

            if (is_string($databasePath) && file_exists($databasePath)) {
                unlink($databasePath);
            }
        }
    }
}
