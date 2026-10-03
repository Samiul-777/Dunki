<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class InsightsAccessTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('job_applications');
        Schema::dropIfExists('jobs_listings');
        Schema::dropIfExists('users');

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('role');
        });

        Schema::create('jobs_listings', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('country');
            $table->unsignedBigInteger('creator_id')->nullable();
            $table->boolean('verified')->default(false);
        });

        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('job_listing_id')->nullable();
            $table->unsignedBigInteger('applicant_id')->nullable();
            $table->string('status');
        });
    }

    public function test_insights_require_authentication(): void
    {
        $this->getJson('/api/insights')->assertUnauthorized();
    }

    public function test_authenticated_non_admin_cannot_access_insights(): void
    {
        $worker = new User(['name' => 'Worker', 'role' => 'worker']);

        $this->actingAs($worker, 'sanctum')
            ->getJson('/api/insights')
            ->assertForbidden();
    }

    public function test_admin_can_load_insights(): void
    {
        $admin = new User(['name' => 'Admin', 'role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/insights')
            ->assertOk()
            ->assertJsonPath('above_average_applicants', []);
    }
}
