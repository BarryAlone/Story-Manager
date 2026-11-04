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
                CREATE TABLE attribute_values (
                    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                    attribute_definition_id INTEGER NOT NULL,
                    character_id INTEGER NULL,
                    world_element_id INTEGER NULL,
                    value_text TEXT NULL,
                    value_number DECIMAL(20,6) NULL,
                    created_at DATETIME NULL,
                    updated_at DATETIME NULL,
                    FOREIGN KEY (attribute_definition_id) REFERENCES attribute_definitions (id) ON DELETE CASCADE,
                    FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE,
                    FOREIGN KEY (world_element_id) REFERENCES world_elements (id) ON DELETE CASCADE,
                    CHECK (
                        (character_id IS NOT NULL AND world_element_id IS NULL)
                        OR
                        (character_id IS NULL AND world_element_id IS NOT NULL)
                    ),
                    CHECK (
                        (value_text IS NOT NULL AND value_number IS NULL)
                        OR
                        (value_text IS NULL AND value_number IS NOT NULL)
                    )
                )
                SQL);

            $this->addIndexes();

            return;
        }

        Schema::create('attribute_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attribute_definition_id')->constrained()->cascadeOnDelete();
            $table->foreignId('character_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('world_element_id')->nullable()->constrained()->cascadeOnDelete();
            $table->text('value_text')->nullable();
            $table->decimal('value_number', 20, 6)->nullable();
            $table->timestamps();
        });

        $this->addIndexes();
    }

    private function addIndexes(): void
    {
        Schema::table('attribute_values', function (Blueprint $table) {
            $table->unique(
                ['attribute_definition_id', 'character_id'],
                'attribute_values_definition_character_unique'
            );
            $table->unique(
                ['attribute_definition_id', 'world_element_id'],
                'attribute_values_definition_world_element_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attribute_values');
    }
};
