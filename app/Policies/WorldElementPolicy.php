<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorldElement;
use Illuminate\Auth\Access\Response;

class WorldElementPolicy
{
    public function view(User $user, WorldElement $worldElement): Response
    {
        return $this->owns($user, $worldElement);
    }

    public function update(User $user, WorldElement $worldElement): Response
    {
        return $this->owns($user, $worldElement);
    }

    public function delete(User $user, WorldElement $worldElement): Response
    {
        return $this->owns($user, $worldElement);
    }

    private function owns(User $user, WorldElement $worldElement): Response
    {
        return $user->id === $worldElement->worldElementCategory?->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
