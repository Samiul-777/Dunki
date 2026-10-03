<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\RagAssistantService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RagAssistantServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('jobs_listings');
        Schema::create('jobs_listings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('creator_id')->nullable();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->text('criteria')->nullable();
            $table->string('country')->nullable();
            $table->string('city')->nullable();
            $table->string('salary')->nullable();
            $table->string('agency')->nullable();
            $table->boolean('verified')->default(false);
            $table->timestamps();
        });
    }
    public function test_it_returns_the_logged_in_username_without_project_doc_fallback(): void
    {
        $user = new User([
            'name' => 'Bablu',
            'role' => 'worker',
        ]);

        $service = new RagAssistantService();
        $result = $service->answer("what's my username", $user);

        $this->assertStringContainsString('Bablu', $result['reply']);
        $this->assertStringNotContainsString('Mission and Problem Space', $result['reply']);
    }

    public function test_it_handles_job_availability_queries_without_project_doc_fallback(): void
    {
        $service = new RagAssistantService();
        $result = $service->answer('what jobs are currently available');

        $this->assertStringContainsString('current', strtolower($result['reply']));
        $this->assertStringNotContainsString('Mission and Problem Space', $result['reply']);
    }

    public function test_it_explains_how_to_choose_a_destination_and_verified_agency(): void
    {
        $service = new RagAssistantService();

        foreach ([
            'how to select my destination and agency',
            'which country and recruiter should I choose?',
            'how can I find a suitable country and recruitment agency?',
            'what is the best place abroad and which agent should I use?',
        ] as $query) {
            $result = $service->answer($query);

            $this->assertStringContainsString('Job search', $result['reply']);
            $this->assertStringContainsString('Verified only', $result['reply']);
            $this->assertStringContainsString('BMET', $result['reply']);
            $this->assertSame(['Job search and verified agencies'], $result['sources']);
        }
    }

    public function test_it_explains_how_to_check_agency_and_job_verification_without_overpromising(): void
    {
        $service = new RagAssistantService();
        $result = $service->answer('How can I verify a recruiting agency has genuine job openings?');

        $this->assertStringContainsString('Verified only', $result['reply']);
        $this->assertStringContainsString('BMET', $result['reply']);
        $this->assertStringContainsString('not a guarantee', strtolower($result['reply']));
        $this->assertSame(['Job search and verified agencies'], $result['sources']);
    }

    public function test_it_explains_that_direct_payment_to_another_user_is_not_supported(): void
    {
        $user = new User([
            'name' => 'Bablu',
            'role' => 'worker',
        ]);

        $service = new RagAssistantService();
        $result = $service->answer('I’d like to make a payment to another user', $user);

        $this->assertStringContainsString('not supported', strtolower($result['reply']));
        $this->assertStringNotContainsString('Mission and Problem Space', $result['reply']);
    }
}
