<?php

namespace App\Policies;

use App\Models\Character;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CharacterPolicy
{
    public function view(User $user, Character $character): Response
    {
        return $this->owns($user, $character);
    }

    public function update(User $user, Character $character): Response
    {
        return $this->owns($user, $character);
    }

    public function delete(User $user, Character $character): Response
    {
        return $this->owns($user, $character);
    }

    private function owns(User $user, Character $character): Response
    {
        return $user->id === $character->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
