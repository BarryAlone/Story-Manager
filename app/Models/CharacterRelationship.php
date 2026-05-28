<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharacterRelationship extends Model
{
    protected $fillable = [
        'character_1_id',
        'character_2_id',
        'relation_name'
    ];

    public function character1(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }

    public function character2(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }
}
