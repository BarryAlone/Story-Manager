<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorldElementCategory;
use Illuminate\Auth\Access\Response;

class WorldElementCategoryPolicy
{
    public function view(User $user, WorldElementCategory $category): Response
    {
        return $this->owns($user, $category);
    }

    public function update(User $user, WorldElementCategory $category): Response
    {
        return $this->owns($user, $category);
    }

    public function delete(User $user, WorldElementCategory $category): Response
    {
        return $this->owns($user, $category);
    }

    private function owns(User $user, WorldElementCategory $category): Response
    {
        return $user->id === $category->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
