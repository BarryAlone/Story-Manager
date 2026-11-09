<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'description',
        'description_long',
        'project_image',
    ];

    public function characters(): HasMany
    {
        return $this->hasMany(Character::class);
    }

    public function chapters(): HasMany
    {
        return $this->hasMany(Chapter::class);
    }

    public function attributeDefinitions(): HasMany
    {
        return $this->hasMany(AttributeDefinition::class);
    }

    public function characterAttributeDefinitions(): HasMany
    {
        return $this->hasMany(AttributeDefinition::class)
            ->where('target_type', AttributeDefinition::TARGET_CHARACTER)
            ->whereNull('world_element_category_id')
            ->ordered();
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function projectInspirations(): HasMany
    {
        return $this->hasMany(ProjectInspiration::class);
    }

    public function worldElementCategories(): HasMany
    {
        return $this->hasMany(WorldElementCategory::class);
    }

    // Relacja polimorficzna pozwalająca przypisać wiele obrazów.
    public function images()
    {
        return $this->morphMany(Image::class, 'imageable');
    }
}
