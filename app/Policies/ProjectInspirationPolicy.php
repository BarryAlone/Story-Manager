<?php

namespace App\Policies;

use App\Models\ProjectInspiration;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ProjectInspirationPolicy
{
    public function view(User $user, ProjectInspiration $projectInspiration): Response
    {
        return $this->owns($user, $projectInspiration);
    }

    public function update(User $user, ProjectInspiration $projectInspiration): Response
    {
        return $this->owns($user, $projectInspiration);
    }

    public function delete(User $user, ProjectInspiration $projectInspiration): Response
    {
        return $this->owns($user, $projectInspiration);
    }

    private function owns(User $user, ProjectInspiration $projectInspiration): Response
    {
        return $user->id === $projectInspiration->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
