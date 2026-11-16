<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use InvalidArgumentException;

class CharacterSectionContent extends Model
{
    protected $fillable = [
        'character_section_definition_id',
        'character_id',
        'content',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $content): void {
            $definition = CharacterSectionDefinition::query()
                ->find($content->character_section_definition_id);
            $character = Character::query()->find($content->character_id);

            if (! $definition || ! $character) {
                throw new InvalidArgumentException('Treść sekcji wymaga istniejącej definicji i postaci.');
            }

            if ((int) $definition->project_id !== (int) $character->project_id) {
                throw new InvalidArgumentException('Definicja sekcji i postać muszą należeć do tego samego projektu.');
            }
        });
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(
            CharacterSectionDefinition::class,
            'character_section_definition_id'
        );
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }
}
