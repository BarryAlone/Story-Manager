<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Chapter;

class ChapterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Chapter::create([
            'project_id' => 1,
            'chapter_number' => 1,
            'name' => 'Rozdział I',
            'description' => 'Testowy rozdział nr 1',
            'description_long' => 'To jest pełny, długi opis rozdziału, który będzie się wyświetlał po wejściu w szczegóły.',
            'chapter_image' => null,
            'timeline_point_start' => null,
            'timeline_point_end' => null,
            'display_label' => null
        ]);

        Chapter::create([
            'project_id' => 1,
            'chapter_number' => 2,
            'name' => 'Rozdział II',
            'description' => 'Testowy rozdział nr 2',
            'description_long' => 'To jest pełny, długi opis rozdziału, który będzie się wyświetlał po wejściu w szczegóły.',
            'chapter_image' => null,
            'timeline_point_start' => null,
            'timeline_point_end' => null,
            'display_label' => null
        ]);
    }
}
