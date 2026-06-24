<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Character extends Model
{
    protected $fillable = [
        'project_id',
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

    public function chapter(): BelongsToMany
    {
        return $this->belongsToMany(Chapter::class);
    }
    
    // Relacja polimorficzna pozwalająca przypisać wiele obrazów.
    public function images()
    {
        return $this->morphMany(Image::class, 'imageable');
    }
}
