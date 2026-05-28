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
        'project_image'
    ];

    public function characters(): HasMany
    {
        return $this->hasMany(Character::class);
    }

    public function chapters(): HasMany
    {
        return $this->hasMany(Chapter::class)  ;  
    }

    public function projectAttributes(): HasMany
    {
        return $this->hasMany(ProjectAttribute::class);

    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }
}
