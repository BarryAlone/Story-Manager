<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorldElement extends Model
{
    protected $fillable = [
        'world_element_category_id',
        'name',
        'description',
        'image_path',
    ];

    public function worldElementCategory(): BelongsTo
    {
        return $this->belongsTo(WorldElementCategory::class);
    }
}
