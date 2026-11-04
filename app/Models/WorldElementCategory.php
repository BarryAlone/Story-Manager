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

    public function attributeDefinitions(): HasMany
    {
        return $this->hasMany(AttributeDefinition::class)
            ->where('target_type', AttributeDefinition::TARGET_WORLD_ELEMENT)
            ->ordered();
    }

    public static function trimName(string $name): string
    {
        return trim($name);
    }

    public static function normalizeName(string $name): string
    {
        return mb_strtolower(self::trimName($name), 'UTF-8');
    }

    protected function name(): Attribute
    {
        return Attribute::make(
            set: function (mixed $value): array {
                $name = self::trimName((string) $value);

                return [
                    'name' => $name,
                    'normalized_name' => self::normalizeName($name),
                ];
            },
        );
    }
}
