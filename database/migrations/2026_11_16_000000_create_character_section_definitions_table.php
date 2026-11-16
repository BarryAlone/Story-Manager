<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('character_section_definitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('title', 128);
            $table->string('normalized_title', 128);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['project_id', 'normalized_title']);
            $table->index(['project_id', 'sort_order', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('character_section_definitions');
    }
};
