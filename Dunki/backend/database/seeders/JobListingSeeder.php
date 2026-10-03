<?php

namespace Database\Seeders;

use App\Models\JobListing;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class JobListingSeeder extends Seeder
{
    public function run(): void
    {
        $agency = User::firstOrCreate(
            ['email' => 'agency@dunki.test'],
            [
                'name' => 'Al-Amin Overseas Ltd.',
                'phone' => '+8801711000001',
                'password' => Hash::make('password123'),
                'role' => 'agency',
                'tracking_id' => 'AGY-2026-000101',
                'verification_status' => 'verified',
                'destination' => 'Saudi Arabia & Gulf',
                'agency' => 'Al-Amin Overseas Ltd.',
                'verified_at' => now(),
            ]
        );

        $jobs = [
            [
                'creator_id' => $agency->id,
                'title' => 'Construction Technician',
                'country' => 'Saudi Arabia',
                'city' => 'Riyadh',
                'salary' => '1,800 SAR / month',
                'agency' => 'Al-Amin Overseas Ltd.',
                'verified' => true
            ],
            [
                'creator_id' => $agency->id,
                'title' => 'Factory Machine Operator',
                'country' => 'Malaysia',
                'city' => 'Johor Bahru',
                'salary' => '1,700 MYR / month',
                'agency' => 'Prime Manpower BD',
                'verified' => true
            ],
            [
                'creator_id' => $agency->id,
                'title' => 'Hotel Housekeeping Staff',
                'country' => 'Qatar',
                'city' => 'Doha',
                'salary' => '1,200 QAR / month',
                'agency' => 'Bismillah Recruiting',
                'verified' => false
            ],
            [
                'creator_id' => $agency->id,
                'title' => 'Warehouse Assistant',
                'country' => 'UAE',
                'city' => 'Dubai',
                'salary' => '1,500 AED / month',
                'agency' => 'Al-Amin Overseas Ltd.',
                'verified' => true
            ],
        ];

        foreach ($jobs as $job) {
            JobListing::firstOrCreate(
                ['title' => $job['title'], 'country' => $job['country']],
                $job
            );
        }
    }
}
