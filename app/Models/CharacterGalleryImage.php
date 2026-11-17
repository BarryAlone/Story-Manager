<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharacterGalleryImage extends Model
{
    protected $fillable = [
        'character_id',
        'image_path',
        'caption',
        'sort_order',
    ];

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }
}
