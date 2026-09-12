<?php

namespace Database\Seeders;

use App\Models\JobListing;
use Illuminate\Database\Seeder;

class JobListingSeeder extends Seeder
{
    public function run(): void
    {
        $jobs = [
            ['title' => 'Construction Technician', 'country' => 'Saudi Arabia', 'city' => 'Riyadh', 'salary' => '1,800 SAR / month', 'agency' => 'Al-Amin Overseas Ltd.', 'verified' => true],
            ['title' => 'Factory Machine Operator', 'country' => 'Malaysia', 'city' => 'Johor Bahru', 'salary' => '1,700 MYR / month', 'agency' => 'Prime Manpower BD', 'verified' => true],
            ['title' => 'Hotel Housekeeping Staff', 'country' => 'Qatar', 'city' => 'Doha', 'salary' => '1,200 QAR / month', 'agency' => 'Bismillah Recruiting', 'verified' => false],
            ['title' => 'Warehouse Assistant', 'country' => 'UAE', 'city' => 'Dubai', 'salary' => '1,500 AED / month', 'agency' => 'Al-Amin Overseas Ltd.', 'verified' => true],
        ];

        foreach ($jobs as $job) {
            JobListing::create($job);
        }
    }
}
