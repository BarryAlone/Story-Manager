<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Event;


class EventSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Event::create([
        'project_id' => '1',
        'chapter_id' => '1',
        'name' => 'Kolacja',
        'description' => 'Niespodziewani goście odwiedzają Bilbo Bagginsa',
        'description_long' => 'Dlugi szczegółowy opis tego wydarzenia którego nie chciało mi się pisać więc jest taki po prostu sklejony tekst z mojego myślo-toku',
        'event_image' => null,
        'timeline_point_start' => null,
        'timeline_point_end' => null,
        'display_label' => null
        ]);

        Event::create([
        'project_id' => '1',
        'chapter_id' => '1',
        'name' => 'Przygoda',
        'description' => 'Bilbo Baggins po przebudzeniu się po kolacji, decyduje się pobiedz za resztą kompanii na wyprawę',
        'description_long' => 'Dlugi szczegółowy opis tego wydarzenia którego nie chciało mi się pisać więc jest taki po prostu sklejony tekst z mojego myślo-toku',
        'event_image' => null,
        'timeline_point_start' => null,
        'timeline_point_end' => null,
        'display_label' => null
        ]);
    }
}
