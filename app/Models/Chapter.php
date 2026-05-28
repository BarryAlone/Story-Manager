<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Chapter extends Model
{
    protected $fillable = [
        'project_id',
        'chapter_number',
        'name',
        'description',
        'chapter_image',
        'timeline_point_start',
        'timeline_point_end',
        'display_label'
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function characters(): HasMany
    {
        return $this->hasMany(Character::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }
}
