<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('character_relationships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('character_1_id')->nullable()->constrained('characters')->cascadeOnDelete();
            $table->foreignId('character_2_id')->nullable()->constrained('characters')->cascadeOnDelete();
            $table->string('relation_name');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('character_relationships');
    }
};
