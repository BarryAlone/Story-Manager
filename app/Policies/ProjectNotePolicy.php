<?php

namespace App\Policies;

use App\Models\ProjectNote;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ProjectNotePolicy
{
    public function view(User $user, ProjectNote $projectNote): Response
    {
        return $this->owns($user, $projectNote);
    }

    public function update(User $user, ProjectNote $projectNote): Response
    {
        return $this->owns($user, $projectNote);
    }

    public function delete(User $user, ProjectNote $projectNote): Response
    {
        return $this->owns($user, $projectNote);
    }

    private function owns(User $user, ProjectNote $projectNote): Response
    {
        return $user->id === $projectNote->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
