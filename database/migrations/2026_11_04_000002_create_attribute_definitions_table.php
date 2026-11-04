<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement(<<<'SQL'
                CREATE TABLE attribute_definitions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                    project_id INTEGER NOT NULL,
                    world_element_category_id INTEGER NULL,
                    target_type VARCHAR NOT NULL CHECK (target_type IN ('character', 'world_element')),
                    scope_key VARCHAR(160) NOT NULL,
                    name VARCHAR(128) NOT NULL,
                    normalized_name VARCHAR(128) NOT NULL,
                    value_type VARCHAR NOT NULL CHECK (value_type IN ('text', 'number')),
                    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
                    created_at DATETIME NULL,
                    updated_at DATETIME NULL,
                    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
                    FOREIGN KEY (world_element_category_id) REFERENCES world_element_categories (id) ON DELETE CASCADE,
                    CHECK (
                        (target_type = 'character'
                            AND world_element_category_id IS NULL
                            AND scope_key = 'character')
                        OR
                        (target_type = 'world_element'
                            AND world_element_category_id IS NOT NULL
                            AND scope_key = 'world-category:' || world_element_category_id)
                    )
                )
                SQL);

            Schema::table('attribute_definitions', function (Blueprint $table) {
                $table->unique(
                    ['project_id', 'scope_key', 'normalized_name'],
                    'attribute_definitions_scope_name_unique'
                );
                $table->index(['project_id', 'target_type']);
                $table->index('world_element_category_id');
            });

            return;
        }

        Schema::create('attribute_definitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('world_element_category_id')
                ->nullable()
                ->constrained()
                ->cascadeOnDelete();
            $table->enum('target_type', ['character', 'world_element']);
            $table->string('scope_key', 160);
            $table->string('name', 128);
            $table->string('normalized_name', 128);
            $table->enum('value_type', ['text', 'number']);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(
                ['project_id', 'scope_key', 'normalized_name'],
                'attribute_definitions_scope_name_unique'
            );
            $table->index(['project_id', 'target_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attribute_definitions');
    }
};
