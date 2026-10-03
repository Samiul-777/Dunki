<?php

namespace Tests\Feature;

use App\Services\DestinationService;
use Tests\TestCase;

class DestinationServiceTest extends TestCase
{
    public function test_profile_destination_overrides_contract_and_application_destinations(): void
    {
        $context = app(DestinationService::class)->resolve('united arab emirates', 'Malaysia', 'Qatar');

        $this->assertSame('UAE', $context['effective_destination']);
        $this->assertSame('profile', $context['source']);
        $this->assertSame(107700, $context['cost_cap']);
    }

    public function test_contract_destination_precedes_application_and_normalizes_city_country_values(): void
    {
        $context = app(DestinationService::class)->resolve(null, 'Riyadh, Saudi Arabia', 'Malaysia');

        $this->assertSame('Saudi Arabia', $context['effective_destination']);
        $this->assertSame('contract', $context['source']);
        $this->assertSame(165000, $context['cost_cap']);
    }

    public function test_application_destination_is_used_when_profile_and_contract_are_empty(): void
    {
        $context = app(DestinationService::class)->resolve(null, null, 'Kuala Lumpur, Malaysia');

        $this->assertSame('Malaysia', $context['effective_destination']);
        $this->assertSame('application', $context['source']);
        $this->assertSame(78990, $context['cost_cap']);
    }

    public function test_unknown_destination_uses_the_general_bmet_cap(): void
    {
        $this->assertSame(150000, app(DestinationService::class)->costCap('Bahrain'));
    }
}
