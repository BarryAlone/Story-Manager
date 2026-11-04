<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use InvalidArgumentException;

class AttributeDefinition extends Model
{
    public const TARGET_CHARACTER = 'character';

    public const TARGET_WORLD_ELEMENT = 'world_element';

    public const TYPE_TEXT = 'text';

    public const TYPE_NUMBER = 'number';

    protected $fillable = [
        'project_id',
        'world_element_category_id',
        'target_type',
        'name',
        'value_type',
        'sort_order',
    ];

    protected $hidden = [
        'normalized_name',
        'scope_key',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $definition): void {
            $definition->prepareScopeForSave();
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function worldElementCategory(): BelongsTo
    {
        return $this->belongsTo(WorldElementCategory::class);
    }

    public function values(): HasMany
    {
        return $this->hasMany(AttributeValue::class);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    public static function normalizeName(string $name): string
    {
        return mb_strtolower(trim($name), 'UTF-8');
    }

    private function prepareScopeForSave(): void
    {
        if (! in_array($this->target_type, [self::TARGET_CHARACTER, self::TARGET_WORLD_ELEMENT], true)) {
            throw new InvalidArgumentException('Nieobsługiwany typ celu definicji atrybutu.');
        }

        if (! in_array($this->value_type, [self::TYPE_TEXT, self::TYPE_NUMBER], true)) {
            throw new InvalidArgumentException('Nieobsługiwany typ wartości definicji atrybutu.');
        }

        $name = trim((string) $this->name);

        if ($name === '' || mb_strlen($name) > 128) {
            throw new InvalidArgumentException('Nazwa definicji atrybutu musi mieć od 1 do 128 znaków.');
        }

        if ((int) $this->sort_order < 0) {
            throw new InvalidArgumentException('Kolejność definicji atrybutu nie może być ujemna.');
        }

        $this->name = $name;
        $this->normalized_name = self::normalizeName($name);

        if ($this->target_type === self::TARGET_CHARACTER) {
            if ($this->world_element_category_id !== null) {
                throw new InvalidArgumentException('Definicja postaci nie może należeć do kategorii elementów świata.');
            }

            $this->scope_key = self::TARGET_CHARACTER;

            return;
        }

        if ($this->world_element_category_id === null) {
            throw new InvalidArgumentException('Definicja elementu świata wymaga kategorii.');
        }

        $category = WorldElementCategory::query()->find($this->world_element_category_id);

        if (! $category || (int) $category->project_id !== (int) $this->project_id) {
            throw new InvalidArgumentException('Kategoria definicji musi należeć do tego samego projektu.');
        }

        $this->scope_key = 'world-category:'.$category->id;
    }
}
