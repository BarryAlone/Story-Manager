<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use InvalidArgumentException;

class CharacterSectionDefinition extends Model
{
    protected $fillable = [
        'project_id',
        'title',
        'sort_order',
    ];

    protected $hidden = [
        'normalized_title',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $definition): void {
            $title = trim((string) $definition->title);

            if ($title === '' || mb_strlen($title) > 128) {
                throw new InvalidArgumentException('Tytuł sekcji postaci musi mieć od 1 do 128 znaków.');
            }

            if ((int) $definition->sort_order < 0) {
                throw new InvalidArgumentException('Kolejność sekcji postaci nie może być ujemna.');
            }

            $definition->title = $title;
            $definition->normalized_title = self::normalizeTitle($title);
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function contents(): HasMany
    {
        return $this->hasMany(CharacterSectionContent::class);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    public static function normalizeTitle(string $title): string
    {
        return mb_strtolower(trim($title), 'UTF-8');
    }
}
