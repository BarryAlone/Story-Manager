<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_link_can_be_requested_without_revealing_account_existence(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $message = 'Jeśli konto z tym adresem istnieje, wysłaliśmy link do ustawienia nowego hasła.';

        $this->postJson('/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertExactJson(['message' => $message]);

        $this->postJson('/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertExactJson(['message' => $message]);

        $this->postJson('/forgot-password', ['email' => 'missing@example.com'])
            ->assertOk()
            ->assertExactJson(['message' => $message]);

        Notification::assertSentTo($user, ResetPassword::class);
        Notification::assertCount(1);
    }

    public function test_reset_link_request_validates_email_format(): void
    {
        $this->postJson('/forgot-password', ['email' => 'invalid-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_reset_link_uses_backend_route_that_redirects_to_configured_spa(): void
    {
        Notification::fake();
        config(['app.frontend_url' => 'https://spa.example.test']);
        $user = User::factory()->create();

        $this->postJson('/forgot-password', ['email' => $user->email])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
            $backendUrl = route('password.reset', [
                'token' => $notification->token,
                'email' => $user->email,
            ]);

            $this->assertSame($backendUrl, $notification->toMail($user)->actionUrl);

            $this->get($backendUrl)->assertRedirect(
                'https://spa.example.test/reset-password/'.rawurlencode($notification->token)
                .'?email='.rawurlencode($user->email)
            );

            return true;
        });
    }

    public function test_password_cannot_be_reset_with_invalid_token(): void
    {
        $user = User::factory()->create();

        $this->postJson('/reset-password', [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertTrue(Hash::check('password', $user->refresh()->password));
    }

    public function test_password_can_be_reset_and_used_to_log_in(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $token = null;

        $this->postJson('/forgot-password', ['email' => $user->email])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use (&$token) {
            $token = $notification->token;

            return true;
        });

        $this->postJson('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
            ->assertOk()
            ->assertJsonStructure(['message']);

        $this->assertTrue(Hash::check('new-password', $user->refresh()->password));

        $this->postJson('/login', [
            'email' => $user->email,
            'password' => 'new-password',
        ])->assertOk();

        $this->assertAuthenticatedAs($user);
    }
}
