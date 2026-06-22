<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Character extends Model
{
    protected $fillable = [
        'project_id',
        'chapter_id',
        'name',
        'group_name',
        'description',
        'character_image',
        'attributes'
    ];

    protected $casts = [
        'attributes' => 'array'
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function chapter(): BelongsTo
    {
        return $this->belongsTo(Chapter::class);
    }

    // Relacja Polimorficzna: Postać ma wiele obrazów
    public function images()
    {
        return $this->morphMany(Image::class, 'imageable');
    }
}
