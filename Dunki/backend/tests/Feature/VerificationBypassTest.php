<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VerificationBypassTest extends TestCase
{
    use RefreshDatabase;

    public function test_worker_can_bypass_and_remains_unverified(): void
    {
        $worker = User::factory()->create([
            'role' => 'worker',
            'verification_status' => 'pending',
            'verified_at' => now(),
        ]);

        $this->actingAs($worker, 'sanctum')
            ->postJson('/api/verification/bypass')
            ->assertOk()
            ->assertJsonPath('status', 'unverified');

        $this->assertSame('unverified', $worker->fresh()->verification_status);
        $this->assertNull($worker->fresh()->verified_at);
    }

    public function test_verified_accounts_cannot_use_the_bypass_to_downgrade_status(): void
    {
        $worker = User::factory()->create([
            'role' => 'worker',
            'verification_status' => 'verified',
            'verified_at' => now(),
        ]);

        $this->actingAs($worker, 'sanctum')
            ->postJson('/api/verification/bypass')
            ->assertStatus(409);

        $this->assertSame('verified', $worker->fresh()->verification_status);
    }
}
