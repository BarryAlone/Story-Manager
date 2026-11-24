<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectTask extends Model
{
    protected $fillable = [
        'project_id',
        'project_note_id',
        'title',
        'content',
        'completed_at',
        'due_date',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
            'due_date' => 'date:Y-m-d',
            'sort_order' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function note(): BelongsTo
    {
        return $this->belongsTo(ProjectNote::class, 'project_note_id');
    }
}
