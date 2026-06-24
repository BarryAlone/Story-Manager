<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Character;


class CharacterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Character::create([
            'project_id' => 1,
            'name' => 'Bilbo Baggins',
            'group_name' => 'Drużyna pierścienia',
            'description' => 'Hobbit z Shire',
            'description_long' => 'To jest pełny, długi opis postaci, który będzie się wyświetlał po wejściu w szczegóły.',
            'character_image' => null,
            'attributes' => null
        ]);

        Character::create([
            'project_id' => 2,
            'name' => 'Thorin Dębowa Tarcza',
            'group_name' => 'Drużyna pierścienia',
            'description' => 'Książe Ereboru',
            'description_long' => 'To jest pełny, długi opis postaci, który będzie się wyświetlał po wejściu w szczegóły.',
            'character_image' => null,
            'attributes' => null
        ]);

         Character::create([
            'project_id' => 2,
            'name' => 'Gandalf Szary',
            'group_name' => 'Drużyna pierścienia',
            'description' => 'Potężny mag',
            'description_long' => 'To jest pełny, długi opis postaci, który będzie się wyświetlał po wejściu w szczegóły.',
            'character_image' => null,
            'attributes' => null
        ]);
    }
}
