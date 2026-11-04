<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorldElementCategory extends Model
{
    protected $fillable = [
        'project_id',
        'name',
    ];

    protected $hidden = [
        'normalized_name',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function worldElements(): HasMany
    {
        return $this->hasMany(WorldElement::class);
    }

    protected function name(): Attribute
    {
        return Attribute::make(
            set: function (mixed $value): array {
                $name = trim((string) $value);

                return [
                    'name' => $name,
                    'normalized_name' => mb_strtolower($name, 'UTF-8'),
                ];
            },
        );
    }
}
