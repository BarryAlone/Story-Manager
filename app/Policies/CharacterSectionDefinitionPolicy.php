<?php

namespace App\Policies;

use App\Models\CharacterSectionDefinition;
use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CharacterSectionDefinitionPolicy
{
    public function create(User $user, Project $project): Response
    {
        return $user->id === $project->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    public function view(User $user, CharacterSectionDefinition $definition): Response
    {
        return $this->owns($user, $definition);
    }

    public function update(User $user, CharacterSectionDefinition $definition): Response
    {
        return $this->owns($user, $definition);
    }

    public function delete(User $user, CharacterSectionDefinition $definition): Response
    {
        return $this->owns($user, $definition);
    }

    private function owns(User $user, CharacterSectionDefinition $definition): Response
    {
        return $user->id === $definition->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
