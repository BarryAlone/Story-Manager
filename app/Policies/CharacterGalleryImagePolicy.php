<?php

namespace App\Policies;

use App\Models\Character;
use App\Models\CharacterGalleryImage;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CharacterGalleryImagePolicy
{
    public function viewAny(User $user, Character $character): Response
    {
        return $this->ownsCharacter($user, $character);
    }

    public function create(User $user, Character $character): Response
    {
        return $this->ownsCharacter($user, $character);
    }

    public function reorder(User $user, Character $character): Response
    {
        return $this->ownsCharacter($user, $character);
    }

    public function update(User $user, CharacterGalleryImage $galleryImage): Response
    {
        return $this->ownsImage($user, $galleryImage);
    }

    public function delete(User $user, CharacterGalleryImage $galleryImage): Response
    {
        return $this->ownsImage($user, $galleryImage);
    }

    private function ownsCharacter(User $user, Character $character): Response
    {
        return $user->id === $character->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    private function ownsImage(User $user, CharacterGalleryImage $galleryImage): Response
    {
        return $this->ownsCharacter($user, $galleryImage->character);
    }
}
