<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chapters', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('description_long');
            $table->foreignId('parent_id')
                ->nullable()
                ->after('project_id')
                ->constrained('chapters')
                ->restrictOnDelete();
            $table->unsignedInteger('sort_order')->default(0)->after('chapter_number');
            $table->boolean('is_in_manuscript')->default(false)->after('sort_order');
        });

        $projectIds = DB::table('chapters')
            ->select('project_id')
            ->distinct()
            ->orderBy('project_id')
            ->pluck('project_id');

        foreach ($projectIds as $projectId) {
            $chapters = DB::table('chapters')
                ->where('project_id', $projectId)
                ->orderByRaw('CASE WHEN chapter_number IS NOT NULL AND chapter_number > 0 THEN 0 ELSE 1 END')
                ->orderBy('chapter_number')
                ->orderBy('id')
                ->get(['id', 'chapter_number']);

            foreach ($chapters as $index => $chapter) {
                DB::table('chapters')
                    ->where('id', $chapter->id)
                    ->update([
                        'sort_order' => $index + 1,
                        'is_in_manuscript' => $chapter->chapter_number !== null
                            && $chapter->chapter_number > 0,
                    ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('chapters', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_id');
            $table->dropColumn(['notes', 'sort_order', 'is_in_manuscript']);
        });
    }
};
