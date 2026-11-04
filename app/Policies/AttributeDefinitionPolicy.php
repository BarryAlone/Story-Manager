<?php

namespace App\Policies;

use App\Models\AttributeDefinition;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class AttributeDefinitionPolicy
{
    public function view(User $user, AttributeDefinition $attributeDefinition): Response
    {
        return $this->owns($user, $attributeDefinition);
    }

    public function update(User $user, AttributeDefinition $attributeDefinition): Response
    {
        return $this->owns($user, $attributeDefinition);
    }

    public function delete(User $user, AttributeDefinition $attributeDefinition): Response
    {
        return $this->owns($user, $attributeDefinition);
    }

    private function owns(User $user, AttributeDefinition $attributeDefinition): Response
    {
        return $user->id === $attributeDefinition->project?->user_id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
