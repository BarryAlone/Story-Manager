<?php

namespace App\Policies;

use App\Models\CharacterRelationship;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CharacterRelationshipPolicy
{
    public function update(User $user, CharacterRelationship $relationship): Response
    {
        return $this->owns($user, $relationship);
    }

    public function delete(User $user, CharacterRelationship $relationship): Response
    {
        return $this->owns($user, $relationship);
    }

    private function owns(User $user, CharacterRelationship $relationship): Response
    {
        $firstProject = $relationship->character1?->project;
        $secondProject = $relationship->character2?->project;

        return $firstProject
            && $secondProject
            && $firstProject->id === $secondProject->id
            && $user->id === $firstProject->user_id
                ? Response::allow()
                : Response::denyAsNotFound();
    }
}
