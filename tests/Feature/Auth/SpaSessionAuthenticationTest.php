<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class SpaSessionAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_log_in_with_json_and_receive_safe_user_data(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertOk();
        $this->assertSafeUserJson($response, $user);
        $this->assertAuthenticatedAs($user);
    }

    public function test_logged_in_user_can_fetch_current_user_in_the_same_session(): void
    {
        $user = User::factory()->create();

        $this->postJson('/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $response = $this->getJson('/api/user');

        $response->assertOk();
        $this->assertSafeUserJson($response, $user);
    }

    public function test_user_cannot_log_in_with_an_invalid_password(): void
    {
        $user = User::factory()->create();

        $this->postJson('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email')
            ->assertJsonMissingPath('password')
            ->assertJsonMissingPath('remember_token');

        $this->assertGuest();
    }

    public function test_user_can_register_with_json_and_receive_safe_user_data(): void
    {
        $response = $this->postJson('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $user = User::where('email', 'test@example.com')->firstOrFail();

        $response->assertCreated();
        $this->assertTrue(Hash::check('password', $user->password));
        $this->assertNotSame('password', $user->password);
        $this->assertSafeUserJson($response, $user);
        $this->assertDatabaseHas('users', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
        $this->assertAuthenticatedAs($user);
    }

    public function test_user_can_log_out_with_json_and_session_is_invalidated(): void
    {
        $user = User::factory()->create();

        $this->postJson('/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $this->postJson('/logout')
            ->assertNoContent();

        $this->assertGuest();
        $this->getJson('/api/user')
            ->assertUnauthorized();
    }

    public function test_vite_frontend_origin_can_use_stateful_session_authentication(): void
    {
        $user = User::factory()->create();

        $this->assertContains(
            'localhost:5173',
            config('sanctum.stateful')
        );

        $loginResponse = $this->withHeader(
            'Origin',
            'http://localhost:5173'
        )->postJson('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $loginResponse
            ->assertOk()
            ->assertHeader(
                'Access-Control-Allow-Origin',
                'http://localhost:5173'
            )
            ->assertHeader('Access-Control-Allow-Credentials', 'true');

        $currentUserResponse = $this->withHeader(
            'Origin',
            'http://localhost:5173'
        )->getJson('/api/user');

        $currentUserResponse
            ->assertOk()
            ->assertHeader(
                'Access-Control-Allow-Origin',
                'http://localhost:5173'
            )
            ->assertHeader('Access-Control-Allow-Credentials', 'true');

        $this->assertSafeUserJson($currentUserResponse, $user);
    }

    public function test_vite_frontend_can_preflight_web_auth_routes(): void
    {
        foreach (['/login', '/register', '/logout'] as $path) {
            $this->withHeaders([
                'Origin' => 'http://localhost:5173',
                'Access-Control-Request-Method' => 'POST',
                'Access-Control-Request-Headers' => 'content-type,x-xsrf-token',
            ])
                ->optionsJson($path)
                ->assertNoContent()
                ->assertHeader(
                    'Access-Control-Allow-Origin',
                    'http://localhost:5173'
                )
                ->assertHeader('Access-Control-Allow-Credentials', 'true');
        }
    }

    private function assertSafeUserJson(TestResponse $response, User $user): void
    {
        $response
            ->assertExactJson([
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ])
            ->assertJsonMissingPath('password')
            ->assertJsonMissingPath('remember_token');
    }
}
