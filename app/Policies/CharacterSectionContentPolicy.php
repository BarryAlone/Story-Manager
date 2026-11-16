<?php

namespace App\Policies;

use App\Models\Character;
use App\Models\CharacterSectionContent;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CharacterSectionContentPolicy
{
    public function create(User $user, Character $character): Response
    {
        return $user->id === $character->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    public function view(User $user, CharacterSectionContent $content): Response
    {
        return $this->owns($user, $content);
    }

    public function update(User $user, CharacterSectionContent $content): Response
    {
        return $this->owns($user, $content);
    }

    public function delete(User $user, CharacterSectionContent $content): Response
    {
        return $this->owns($user, $content);
    }

    private function owns(User $user, CharacterSectionContent $content): Response
    {
        return $user->id === $content->character?->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
