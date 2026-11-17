<?php

namespace Database\Seeders;

use App\Models\Character;
use Illuminate\Database\Seeder;

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
            'character_image' => null,
        ]);

        Character::create([
            'project_id' => 1,
            'name' => 'Thorin Dębowa Tarcza',
            'group_name' => 'Drużyna pierścienia',
            'description' => 'Książe Ereboru',
            'character_image' => null,
        ]);

        Character::create([
            'project_id' => 1,
            'name' => 'Gandalf Szary',
            'group_name' => 'Drużyna pierścienia',
            'description' => 'Potężny mag',
            'character_image' => null,
        ]);
    }
}
