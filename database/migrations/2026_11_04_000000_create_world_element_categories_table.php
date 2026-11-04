<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('world_element_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('name', 128);
            $table->string('normalized_name', 128);
            $table->timestamps();

            $table->unique(['project_id', 'normalized_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('world_element_categories');
    }
};
