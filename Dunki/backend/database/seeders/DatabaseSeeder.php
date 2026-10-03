<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\JobListing;
use App\Models\JobApplication;
use App\Models\Contract;
use App\Models\Document;
use App\Models\Payment;
use App\Models\Complaint;
use App\Models\Notification;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Jobs
        $this->call([
            JobListingSeeder::class,
        ]);

        // 2. Seed Agency User
        $agency = User::firstOrCreate(
            ['email' => 'agency@dunki.test'],
            [
                'name' => 'Al-Amin Overseas Ltd.',
                'phone' => '+8801711000001',
                'password' => Hash::make('password123'),
                'role' => 'agency',
                'tracking_id' => 'AGY-2026-000101',
                'verification_status' => 'verified',
                'destination' => 'Gulf & East Asia',
                'agency' => 'Al-Amin Overseas Ltd.',
                'verified_at' => now(),
            ]
        );

        // Assign agency to jobs
        JobListing::where('agency', 'Al-Amin Overseas Ltd.')->update(['creator_id' => $agency->id]);

        // 3. Seed Worker User
        $worker = User::firstOrCreate(
            ['email' => 'worker@dunki.test'],
            [
                'name' => 'Md. Rafiqul Islam',
                'phone' => '+8801811000002',
                'password' => Hash::make('password123'),
                'role' => 'worker',
                'tracking_id' => 'DNK-2026-004821',
                'verification_status' => 'verified',
                'destination' => 'Riyadh, Saudi Arabia',
                'agency' => 'Al-Amin Overseas Ltd.',
                'verified_at' => now(),
            ]
        );

        // 4. Seed Applications
        $saudiJob = JobListing::where('country', 'Saudi Arabia')->first();
        if ($saudiJob) {
            JobApplication::firstOrCreate(
                [
                    'job_listing_id' => $saudiJob->id,
                    'applicant_id'   => $worker->id,
                ],
                [
                    'status' => 'accepted',
                    'note'   => '5 years experience as certified electrical technician. Valid passport ready.',
                ]
            );
        }

        // 5. Seed Contracts
        Contract::firstOrCreate(
            [
                'user_id'   => $worker->id,
                'job_title' => 'Construction Technician',
            ],
            [
                'destination_country' => 'Saudi Arabia',
                'agency_name'         => 'Al-Amin Overseas Ltd.',
                'salary_amount'       => 1800,
                'salary_currency'     => 'SAR',
                'status'              => 'verified',
            ]
        );

        // 6. Seed Documents
        $docs = [
            ['name' => 'National ID (NID)', 'type' => 'nid', 'status' => 'complete'],
            ['name' => 'Passport copy', 'type' => 'passport', 'status' => 'complete'],
            ['name' => 'Medical fitness report', 'type' => 'medical', 'status' => 'complete'],
            ['name' => 'Training certificate', 'type' => 'training', 'status' => 'complete'],
            ['name' => 'Police clearance', 'type' => 'police', 'status' => 'missing'],
        ];

        foreach ($docs as $doc) {
            Document::firstOrCreate(
                [
                    'user_id' => $worker->id,
                    'name'    => $doc['name'],
                ],
                [
                    'type'   => $doc['type'],
                    'status' => $doc['status'],
                ]
            );
        }

        // 7. Seed Payments
        $payments = [
            [
                'purpose'        => 'Agency processing fee',
                'amount'         => 45000,
                'currency'       => 'BDT',
                'payment_method' => 'bKash',
                'transaction_id' => 'BK92841029X',
                'agency_name'    => 'Al-Amin Overseas Ltd.',
                'status'         => 'verified',
                'payment_date'   => '2026-06-02',
                'notes'          => 'Initial service deposit acknowledged by agency ledger.',
            ],
            [
                'purpose'        => 'Medical test fee',
                'amount'         => 3500,
                'currency'       => 'BDT',
                'payment_method' => 'Cash receipt',
                'transaction_id' => 'MED-RC-88192',
                'agency_name'    => 'GAMCA Approved Medical Center',
                'status'         => 'completed',
                'payment_date'   => '2026-06-10',
                'notes'          => 'Chest X-Ray, blood screening, and biometric test.',
            ],
            [
                'purpose'        => 'Training fee',
                'amount'         => 8000,
                'currency'       => 'BDT',
                'payment_method' => 'Bank transfer',
                'transaction_id' => 'TXN-DBBL-550921',
                'agency_name'    => 'TTC Mirpur (BMET Accredited)',
                'status'         => 'completed',
                'payment_date'   => '2026-06-18',
                'notes'          => '3-day mandatory pre-departure briefing and safety course.',
            ],
        ];

        foreach ($payments as $p) {
            Payment::firstOrCreate(
                [
                    'user_id'        => $worker->id,
                    'transaction_id' => $p['transaction_id'],
                ],
                $p
            );
        }

        // 8. Seed Complaints
        Complaint::firstOrCreate(
            [
                'tracking_id' => 'CMP-2026-00128',
            ],
            [
                'user_id'          => $worker->id,
                'against_agency'   => 'Prime Manpower BD',
                'category'         => 'Overcharging / Illegal Fees',
                'subject'          => 'Demanded additional ৳30,000 unreceipted cash for visa stamping',
                'description'      => 'Agency representative demanded additional unreceipted cash claiming government visa processing price hike. Refused to provide official cash receipt.',
                'priority'         => 'high',
                'status'           => 'under_review',
                'resolution_notes' => 'BMET vigilance officer assigned. Show cause notice drafted to agency.',
            ]
        );

        // 9. Seed Notifications
        $notifs = [
            [
                'title' => 'Contract verified on Official Registry',
                'detail' => 'Your contract with Al-Amin Overseas Ltd. (1,800 SAR/mo) is verified.',
                'level' => 'verified',
                'link' => '/contracts',
            ],
            [
                'title' => 'Medical fitness cleared',
                'detail' => 'GAMCA medical examination report uploaded and verified for Saudi embassy visa.',
                'level' => 'info',
                'link' => '/documents',
            ],
            [
                'title' => 'Police clearance pending upload',
                'detail' => 'Submit your police clearance certificate to begin visa stamping stage.',
                'level' => 'warning',
                'link' => '/documents',
            ],
        ];

        foreach ($notifs as $n) {
            Notification::firstOrCreate(
                [
                    'user_id' => $worker->id,
                    'title'   => $n['title'],
                ],
                $n
            );
        }
    }
}
