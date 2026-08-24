<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ProjectPolicy
{
    public function view(User $user, Project $project): Response
    {
        return $this->owns($user, $project);
    }

    public function update(User $user, Project $project): Response
    {
        return $this->owns($user, $project);
    }

    public function delete(User $user, Project $project): Response
    {
        return $this->owns($user, $project);
    }

    private function owns(User $user, Project $project): Response
    {
        return $user->id === $project->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
