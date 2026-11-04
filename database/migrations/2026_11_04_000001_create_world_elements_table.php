<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('world_elements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('world_element_category_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('name', 128);
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('world_elements');
    }
};
