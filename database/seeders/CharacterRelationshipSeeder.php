<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\CharacterRelationship;


class CharacterRelationshipSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        CharacterRelationship::create([
            'character_1_id' => 1,
            'character_2_id' => 2,
            'relation_name' => 'przyjaciel'
        ]);

        CharacterRelationship::create([
            'character_1_id' => 1,
            'character_2_id' => 3,
            'relation_name' => 'mentor'
        ]);
    }
}
