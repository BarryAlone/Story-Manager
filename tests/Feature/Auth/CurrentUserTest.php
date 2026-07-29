<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CurrentUserTest extends TestCase 

{
    use RefreshDatabase;

    public function test_guest_cannot_fetch_current_user(): void
    {
        $this->getJson('/api/user')
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_fetch_current_user(): void
    {
        $user = User::factory()->create();
    
        $this->actingAs($user)    
        ->getJson('/api/user')
            ->assertOk()
            ->assertExactJson([ // Określa kontrakt odpowiedzi. Gdy pojawi sie password, rembmer_token lub inne pole, test nie przejdzie.
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]);
    }
}