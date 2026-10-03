<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Contract;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProfileSecurityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('users');
        Schema::dropIfExists('contracts');
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role')->default('worker');
            $table->string('destination')->nullable();
            $table->timestamps();
        });

        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('destination_country');
            $table->timestamps();
        });
    }

    public function test_password_change_requires_authentication(): void
    {
        $this->putJson('/api/me/password', [
            'current_password' => 'CurrentPass123!',
            'new_password' => 'NewPass123!',
            'new_password_confirmation' => 'NewPass123!',
        ])->assertUnauthorized();
    }

    public function test_destination_update_requires_authentication(): void
    {
        $this->putJson('/api/me/destination', ['destination' => 'Malaysia'])->assertUnauthorized();
    }

    public function test_user_can_save_a_canonical_destination_and_cap(): void
    {
        $user = $this->createUser();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/me/destination', ['destination' => 'United Arab Emirates'])
            ->assertOk()
            ->assertJsonPath('profile_destination', 'UAE')
            ->assertJsonPath('effective_destination', 'UAE')
            ->assertJsonPath('cost_cap', 107700);

        $this->assertSame('UAE', $user->fresh()->destination);
    }

    public function test_clearing_saved_destination_falls_back_to_latest_contract(): void
    {
        $user = $this->createUser();
        $user->destination = 'Malaysia';
        $user->save();
        Contract::create([
            'user_id' => $user->id,
            'destination_country' => 'Riyadh, Saudi Arabia',
        ]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/me/destination', ['destination' => null])
            ->assertOk()
            ->assertJsonPath('profile_destination', null)
            ->assertJsonPath('effective_destination', 'Saudi Arabia')
            ->assertJsonPath('source', 'contract')
            ->assertJsonPath('cost_cap', 165000);

        $this->assertNull($user->fresh()->destination);
    }

    public function test_password_change_rejects_an_incorrect_current_password(): void
    {
        $user = $this->createUser();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/me/password', [
                'current_password' => 'incorrect',
                'new_password' => 'NewPass123!',
                'new_password_confirmation' => 'NewPass123!',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');
    }

    public function test_password_change_hashes_the_new_password(): void
    {
        $user = $this->createUser();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/me/password', [
                'current_password' => 'CurrentPass123!',
                'new_password' => 'NewPass123!',
                'new_password_confirmation' => 'NewPass123!',
            ])
            ->assertOk()
            ->assertJson(['message' => 'Password updated successfully.']);

        $this->assertTrue(Hash::check('NewPass123!', $user->fresh()->password));
    }

    private function createUser(): User
    {
        return User::create([
            'name' => 'Profile User',
            'email' => 'profile@example.test',
            'password' => 'CurrentPass123!',
            'role' => 'worker',
        ]);
    }
}
