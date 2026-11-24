<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_checklist_items', function (Blueprint $table): void {
            $table->dropIndex(['project_id', 'completed_at', 'sort_order']);
        });

        Schema::rename('project_checklist_items', 'project_tasks');

        Schema::table('project_tasks', function (Blueprint $table): void {
            $table->renameColumn('content', 'title');
        });

        Schema::table('project_tasks', function (Blueprint $table): void {
            $table->foreignId('project_note_id')
                ->nullable()
                ->after('project_id')
                ->constrained('project_notes')
                ->nullOnDelete();
            $table->longText('content')->nullable()->after('title');
            $table->index(['project_id', 'completed_at', 'sort_order']);
            $table->index(['project_id', 'project_note_id']);
        });
    }

    public function down(): void
    {
        Schema::table('project_tasks', function (Blueprint $table): void {
            $table->dropIndex(['project_id', 'project_note_id']);
            $table->dropIndex(['project_id', 'completed_at', 'sort_order']);
            $table->dropConstrainedForeignId('project_note_id');
            $table->dropColumn('content');
        });

        Schema::table('project_tasks', function (Blueprint $table): void {
            $table->renameColumn('title', 'content');
        });

        Schema::rename('project_tasks', 'project_checklist_items');

        Schema::table('project_checklist_items', function (Blueprint $table): void {
            $table->index(['project_id', 'completed_at', 'sort_order']);
        });
    }
};
