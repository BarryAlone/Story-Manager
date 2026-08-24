<?php

namespace App\Policies;

use App\Models\ProjectAttribute;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ProjectAttributePolicy
{
    public function update(User $user, ProjectAttribute $projectAttribute): Response
    {
        return $this->owns($user, $projectAttribute);
    }

    public function delete(User $user, ProjectAttribute $projectAttribute): Response
    {
        return $this->owns($user, $projectAttribute);
    }

    private function owns(User $user, ProjectAttribute $projectAttribute): Response
    {
        return $user->id === $projectAttribute->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
