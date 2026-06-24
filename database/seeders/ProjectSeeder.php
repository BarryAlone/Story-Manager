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
            'name' => 'Hobbit',
            'description' => 'Przygoda Hobbita z Shire',
            'description_long' => 'Hobbit niechetnie idzie na przygode, napotyka problemy i przyjaciół. Na koniec wraca zwycięzko do domu.',
            'project_image' => null,
        ]);

        Project::create([
            'user_id' => 1,
            'name' => 'Drugi pierwszy projekt',
            'description' => 'Przykladowy projekt z wlasnego seedera',
            'description_long' => 'To jest pełny, długi opis projektu, który będzie się wyświetlał po wejściu w szczegóły.',
            'project_image' => null,
            ]);
    }
}
