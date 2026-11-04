<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use InvalidArgumentException;

class AttributeValue extends Model
{
    protected $fillable = [
        'attribute_definition_id',
        'character_id',
        'world_element_id',
        'value_text',
        'value_number',
    ];

    protected function casts(): array
    {
        return [
            'value_number' => 'decimal:6',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $value): void {
            $hasCharacter = $value->character_id !== null;
            $hasWorldElement = $value->world_element_id !== null;
            $hasText = $value->value_text !== null;
            $hasNumber = $value->value_number !== null;

            if ($hasCharacter === $hasWorldElement) {
                throw new InvalidArgumentException('Wartość atrybutu musi należeć dokładnie do jednej encji.');
            }

            if ($hasText === $hasNumber) {
                throw new InvalidArgumentException('Wartość atrybutu musi zawierać dokładnie jedną wartość.');
            }
        });
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(AttributeDefinition::class, 'attribute_definition_id');
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }

    public function worldElement(): BelongsTo
    {
        return $this->belongsTo(WorldElement::class);
    }
}
