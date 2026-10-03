<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\JobApplication;
use App\Models\User;

class DestinationService
{
    private const BMET_COST_CAPS = [
        'Saudi Arabia' => 165000,
        'Malaysia' => 78990,
        'Qatar' => 100000,
        'UAE' => 107700,
        'Kuwait' => 106500,
        'Oman' => 100500,
        'Singapore' => 262000,
    ];

    public function resolve(?string $profileDestination, ?string $contractDestination = null, ?string $jobDestination = null): array
    {
        $profileDestination = $this->normalize($profileDestination);
        $contractDestination = $this->normalize($contractDestination);
        $jobDestination = $this->normalize($jobDestination);

        $effectiveDestination = $profileDestination ?: ($contractDestination ?: $jobDestination);
        $source = $profileDestination ? 'profile' : ($contractDestination ? 'contract' : ($jobDestination ? 'application' : null));

        return [
            'profile_destination' => $profileDestination,
            'effective_destination' => $effectiveDestination,
            'source' => $source,
            'cost_cap' => $this->costCap($effectiveDestination),
        ];
    }

    public function forUser(User $user): array
    {
        $contractDestination = null;
        $jobDestination = null;

        if (!$user->destination) {
            $contractDestination = Contract::query()
                ->where('user_id', $user->id)
                ->latest()
                ->value('destination_country');

            if (!$contractDestination) {
                $application = JobApplication::query()
                    ->with('job:id,country')
                    ->where('applicant_id', $user->id)
                    ->latest()
                    ->first();
                $jobDestination = $application?->job?->country;
            }
        }

        return $this->resolve($user->destination, $contractDestination, $jobDestination);
    }

    public function normalize(?string $destination): ?string
    {
        $destination = trim((string) $destination);
        if ($destination === '') {
            return null;
        }

        $canonical = [
            'saudi arabia' => 'Saudi Arabia',
            'malaysia' => 'Malaysia',
            'qatar' => 'Qatar',
            'uae' => 'UAE',
            'u.a.e.' => 'UAE',
            'united arab emirates' => 'UAE',
            'kuwait' => 'Kuwait',
            'oman' => 'Oman',
            'singapore' => 'Singapore',
        ];

        $parts = array_reverse(array_map('trim', explode(',', $destination)));
        foreach ($parts as $part) {
            $key = strtolower($part);
            if (isset($canonical[$key])) {
                return $canonical[$key];
            }
        }

        return $parts[0];
    }

    public function costCap(?string $destination): int
    {
        $destination = $this->normalize($destination);
        return self::BMET_COST_CAPS[$destination ?? ''] ?? 150000;
    }
}
