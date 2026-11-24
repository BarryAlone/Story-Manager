<?php

namespace App\Policies;

use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ProjectTaskPolicy
{
    public function view(User $user, ProjectTask $projectTask): Response
    {
        return $this->owns($user, $projectTask);
    }

    public function update(User $user, ProjectTask $projectTask): Response
    {
        return $this->owns($user, $projectTask);
    }

    public function delete(User $user, ProjectTask $projectTask): Response
    {
        return $this->owns($user, $projectTask);
    }

    private function owns(User $user, ProjectTask $projectTask): Response
    {
        return $user->id === $projectTask->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
