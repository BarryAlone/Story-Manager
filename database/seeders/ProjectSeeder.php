<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Project;

class ProjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Project::create([
            'user_id' => 1,
            'name' => 'Mój pierwszy projekt',
            'description' => 'Przykladowy projekt z wlasnego seedera',
            'description_long' => 'To jest pełny, długi opis projektu, który będzie się wyświetlał po wejściu w szczegóły.',
            'project_image' => null,
        ]);
    }
}
