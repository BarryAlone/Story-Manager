<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ChapterContentStructureMigrationTest extends TestCase
{
    public function test_migration_backfills_legacy_chapters_and_rolls_back_safely(): void
    {
        $originalConnection = config('database.default');
        $databasePath = tempnam(sys_get_temp_dir(), 'story-manager-chapters-');

        config([
            'database.default' => 'chapter_structure_test',
            'database.connections.chapter_structure_test' => [
                'driver' => 'sqlite',
                'database' => $databasePath,
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        DB::purge('chapter_structure_test');

        try {
            Schema::create('projects', function (Blueprint $table): void {
                $table->id();
            });
            Schema::create('chapters', function (Blueprint $table): void {
                $table->id();
                $table->integer('chapter_number')->nullable();
                $table->foreignId('project_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('description')->nullable();
                $table->mediumText('description_long')->nullable();
                $table->string('chapter_image')->nullable();
                $table->integer('timeline_point_start')->nullable();
                $table->integer('timeline_point_end')->nullable();
                $table->string('display_label')->nullable();
                $table->timestamps();
            });

            DB::table('projects')->insert(['id' => 1]);
            DB::table('chapters')->insert([
                [
                    'id' => 1,
                    'project_id' => 1,
                    'chapter_number' => 2,
                    'name' => 'Second',
                    'description' => 'Second synopsis',
                    'description_long' => '<p>Second content</p>',
                ],
                [
                    'id' => 2,
                    'project_id' => 1,
                    'chapter_number' => null,
                    'name' => 'Draft',
                    'description' => 'Draft synopsis',
                    'description_long' => '<p>Draft content</p>',
                ],
                [
                    'id' => 3,
                    'project_id' => 1,
                    'chapter_number' => 1,
                    'name' => 'First',
                    'description' => 'First synopsis',
                    'description_long' => '<p>First content</p>',
                ],
            ]);

            $migration = require database_path(
                'migrations/2026_10_19_000000_add_content_structure_to_chapters_table.php'
            );
            $migration->up();

            $this->assertDatabaseHas('chapters', [
                'id' => 3,
                'is_in_manuscript' => true,
                'sort_order' => 1,
                'parent_id' => null,
                'description_long' => '<p>First content</p>',
            ], 'chapter_structure_test');
            $this->assertDatabaseHas('chapters', [
                'id' => 1,
                'is_in_manuscript' => true,
                'sort_order' => 2,
                'parent_id' => null,
                'description_long' => '<p>Second content</p>',
            ], 'chapter_structure_test');
            $this->assertDatabaseHas('chapters', [
                'id' => 2,
                'is_in_manuscript' => false,
                'sort_order' => 3,
                'parent_id' => null,
                'description_long' => '<p>Draft content</p>',
            ], 'chapter_structure_test');

            $migration->down();

            $this->assertFalse(Schema::hasColumn('chapters', 'notes'));
            $this->assertFalse(Schema::hasColumn('chapters', 'parent_id'));
            $this->assertFalse(Schema::hasColumn('chapters', 'sort_order'));
            $this->assertFalse(Schema::hasColumn('chapters', 'is_in_manuscript'));
            $this->assertDatabaseHas('chapters', [
                'id' => 3,
                'description' => 'First synopsis',
                'description_long' => '<p>First content</p>',
            ], 'chapter_structure_test');
        } finally {
            DB::disconnect('chapter_structure_test');
            config(['database.default' => $originalConnection]);
            DB::purge('chapter_structure_test');

            if (is_string($databasePath) && file_exists($databasePath)) {
                unlink($databasePath);
            }
        }
    }
}
