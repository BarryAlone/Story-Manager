<?php

namespace App\Policies;

use App\Models\ProjectChecklistItem;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ProjectChecklistItemPolicy
{
    public function view(User $user, ProjectChecklistItem $projectChecklistItem): Response
    {
        return $this->owns($user, $projectChecklistItem);
    }

    public function update(User $user, ProjectChecklistItem $projectChecklistItem): Response
    {
        return $this->owns($user, $projectChecklistItem);
    }

    public function delete(User $user, ProjectChecklistItem $projectChecklistItem): Response
    {
        return $this->owns($user, $projectChecklistItem);
    }

    private function owns(User $user, ProjectChecklistItem $projectChecklistItem): Response
    {
        return $user->id === $projectChecklistItem->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
