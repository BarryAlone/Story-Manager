<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Chapter extends Model
{
    protected $fillable = [
        'project_id',
        'parent_id',
        'chapter_number',
        'sort_order',
        'is_in_manuscript',
        'name',
        'description',
        'description_long',
        'notes',
        'chapter_image',
        'timeline_point_start',
        'timeline_point_end',
        'display_label'
    ];

    protected function casts(): array
    {
        return [
            'parent_id' => 'integer',
            'chapter_number' => 'integer',
            'sort_order' => 'integer',
            'is_in_manuscript' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function characters(): BelongsToMany
    {
        return $this->belongsToMany(Character::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    // Relacja polimorficzna pozwalająca przypisać wiele obrazów.
    public function images()
    {
        return $this->morphMany(Image::class, 'imageable');
    }
}
