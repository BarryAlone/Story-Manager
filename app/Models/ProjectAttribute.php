<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAttribute extends Model
{
    protected $fillable = [
        'project_id',
        'name',
        'type'
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
