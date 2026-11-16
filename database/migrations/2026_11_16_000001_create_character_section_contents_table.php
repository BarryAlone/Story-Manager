<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('character_section_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('character_section_definition_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignId('character_id')->constrained()->cascadeOnDelete();
            $table->longText('content');
            $table->timestamps();

            $table->unique(['character_section_definition_id', 'character_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('character_section_contents');
    }
};
