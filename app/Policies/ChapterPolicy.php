<?php

namespace App\Policies;

use App\Models\Chapter;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ChapterPolicy
{
    public function view(User $user, Chapter $chapter): Response
    {
        return $this->owns($user, $chapter);
    }

    public function update(User $user, Chapter $chapter): Response
    {
        return $this->owns($user, $chapter);
    }

    public function delete(User $user, Chapter $chapter): Response
    {
        return $this->owns($user, $chapter);
    }

    private function owns(User $user, Chapter $chapter): Response
    {
        return $user->id === $chapter->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
