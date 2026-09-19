<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_update_a_profile(): void
    {
        $this->patchJson('/api/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ])->assertUnauthorized();
    }

    public function test_profile_information_can_be_updated_with_json(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patchJson('/api/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $response
            ->assertOk()
            ->assertExactJson([
                'id' => $user->id,
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patchJson('/api/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ])
            ->assertOk();

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account_and_session_with_json(): void
    {
        $user = User::factory()->create();

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/login', [
                'email' => $user->email,
                'password' => 'password',
            ])
            ->assertOk();

        $this->deleteJson('/api/profile', ['password' => 'password'])
            ->assertNoContent();

        $this->app['auth']->forgetGuards();

        $this->assertGuest();
        $this->assertNull($user->fresh());
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_correct_password_must_be_provided_to_delete_account(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->deleteJson('/api/profile', ['password' => 'wrong-password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->assertAuthenticatedAs($user);
        $this->assertNotNull($user->fresh());
    }
}
