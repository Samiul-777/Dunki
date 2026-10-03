<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\Contract;
use App\Models\JobApplication;
use App\Models\JobListing;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentTransactionTest extends TestCase
{
    use RefreshDatabase;

    public function test_agency_search_only_returns_registered_agencies(): void
    {
        User::factory()->create([
            'name' => 'Al Amin Overseas',
            'agency' => 'Al-Amin Recruitment',
            'role' => 'agency',
        ]);
        User::factory()->create([
            'name' => 'Al Amin Worker',
            'role' => 'worker',
        ]);

        $worker = User::factory()->create(['role' => 'worker']);

        $this->actingAs($worker, 'sanctum')
            ->getJson('/api/agencies/search?search=Al-Amin')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.display_name', 'Al-Amin Recruitment');
    }

    public function test_sslcommerz_initiation_rejects_a_non_agency_recipient(): void
    {
        $worker = User::factory()->create(['role' => 'worker']);

        $this->actingAs($worker, 'sanctum')
            ->postJson('/api/payments/initiate-sslcommerz', [
                'purpose' => 'Agency processing fee',
                'amount' => 1200,
                'agency_id' => $worker->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('agency_id');

        $this->assertDatabaseCount('payments', 0);
    }

    public function test_agencies_can_search_only_workers_who_applied_or_have_a_contract(): void
    {
        $agency = User::factory()->create([
            'role' => 'agency',
            'name' => 'North Star Agency',
            'agency' => 'North Star Recruitment',
        ]);
        $applicant = User::factory()->create([
            'role' => 'worker',
            'name' => 'Search Applicant',
        ]);
        $contractWorker = User::factory()->create([
            'role' => 'worker',
            'name' => 'Search Contract Worker',
        ]);
        User::factory()->create([
            'role' => 'worker',
            'name' => 'Search Unrelated Worker',
        ]);

        $job = JobListing::create([
            'creator_id' => $agency->id,
            'title' => 'Technician',
            'country' => 'UAE',
            'city' => 'Dubai',
            'salary' => '1500 AED',
            'agency' => $agency->agency,
        ]);
        JobApplication::create([
            'job_listing_id' => $job->id,
            'applicant_id' => $applicant->id,
            'status' => 'pending',
        ]);
        Contract::create([
            'user_id' => $contractWorker->id,
            'agency_id' => $agency->id,
            'job_title' => 'Technician',
            'destination_country' => 'UAE',
            'agency_name' => $agency->agency,
            'salary_amount' => 1500,
            'salary_currency' => 'AED',
            'status' => 'verified',
        ]);

        $this->actingAs($agency, 'sanctum')
            ->getJson('/api/workers/search?search=Search')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['name' => 'Search Applicant'])
            ->assertJsonFragment(['name' => 'Search Contract Worker'])
            ->assertJsonMissing(['name' => 'Search Unrelated Worker']);
    }

    public function test_agency_checkout_records_the_agency_as_payer_and_worker_as_recipient(): void
    {
        Http::fake(['*' => Http::response(['status' => 'FAIL'])]);
        $agency = User::factory()->create([
            'role' => 'agency',
            'name' => 'North Star Agency',
            'agency' => 'North Star Recruitment',
        ]);
        $worker = User::factory()->create(['role' => 'worker']);
        $job = JobListing::create([
            'creator_id' => $agency->id,
            'title' => 'Technician',
            'country' => 'UAE',
            'city' => 'Dubai',
            'salary' => '1500 AED',
            'agency' => $agency->agency,
        ]);
        JobApplication::create([
            'job_listing_id' => $job->id,
            'applicant_id' => $worker->id,
            'status' => 'pending',
        ]);
        $unrelatedWorker = User::factory()->create(['role' => 'worker']);

        $this->actingAs($agency, 'sanctum')
            ->postJson('/api/payments/initiate-sslcommerz', [
                'purpose' => 'Worker advance',
                'amount' => 5000,
                'worker_id' => $unrelatedWorker->id,
            ])
            ->assertUnprocessable()
            ->assertJsonFragment(['message' => 'Choose a worker who applied to your jobs or has a contract with your agency.']);

        $this->assertDatabaseCount('payments', 0);

        $this->actingAs($agency, 'sanctum')
            ->postJson('/api/payments/initiate-sslcommerz', [
                'purpose' => 'Worker advance',
                'amount' => 5000,
                'worker_id' => $worker->id,
            ])
            ->assertOk()
            ->assertJsonPath('is_sandbox_fallback', true);

        $this->assertDatabaseHas('payments', [
            'user_id' => $worker->id,
            'agency_id' => $agency->id,
            'payer_id' => $agency->id,
            'recipient_worker_id' => $worker->id,
            'status' => 'pending',
        ]);
    }

    public function test_generic_payment_routes_cannot_finalize_or_delete_gateway_payments(): void
    {
        $worker = User::factory()->create(['role' => 'worker']);
        $agency = User::factory()->create(['role' => 'agency']);
        $payment = Payment::create([
            'user_id' => $worker->id,
            'agency_id' => $agency->id,
            'agency_name' => $agency->name,
            'purpose' => 'Agency processing fee',
            'amount' => 1200,
            'currency' => 'BDT',
            'payment_method' => 'SSLCommerz Gateway',
            'transaction_id' => 'DNK-SSL-IMMUTABLE-1',
            'status' => 'pending',
            'payment_date' => now()->toDateString(),
        ]);

        $this->actingAs($worker, 'sanctum')
            ->patchJson("/api/payments/{$payment->id}", ['status' => 'verified'])
            ->assertForbidden();

        $this->deleteJson("/api/payments/{$payment->id}")->assertForbidden();
        $this->assertSame('pending', $payment->fresh()->status);
    }

    public function test_profile_transactions_are_limited_to_the_worker_and_recipient_agency(): void
    {
        $worker = User::factory()->create(['role' => 'worker']);
        $otherWorker = User::factory()->create(['role' => 'worker']);
        $unrelatedWorker = User::factory()->create(['role' => 'worker']);
        $agency = User::factory()->create(['role' => 'agency']);
        $otherAgency = User::factory()->create(['role' => 'agency']);
        $payment = $this->createVerifiedPayment($worker, $agency, 'TXN-PARTY-1');
        $this->createVerifiedPayment($otherWorker, $otherAgency, 'TXN-PARTY-2');
        $pendingPayment = Payment::create([
            'user_id' => $worker->id,
            'agency_id' => $agency->id,
            'payer_id' => $worker->id,
            'agency_name' => $agency->name,
            'purpose' => 'Visa processing',
            'amount' => 300,
            'currency' => 'USD',
            'payment_method' => 'SSLCommerz Gateway',
            'transaction_id' => 'TXN-PENDING-USD',
            'status' => 'pending',
            'payment_date' => now()->toDateString(),
        ]);

        $this->actingAs($worker, 'sanctum')
            ->getJson('/api/me/transactions')
            ->assertOk()
            ->assertJsonCount(2, 'transactions')
            ->assertJsonFragment(['id' => $payment->id, 'status' => 'verified'])
            ->assertJsonFragment(['id' => $pendingPayment->id, 'status' => 'pending'])
            ->assertJsonCount(2, 'totals_by_currency')
            ->assertJsonFragment([
                'currency' => 'BDT',
                'transaction_count' => 1,
                'sent_total' => 1200,
                'received_total' => 0,
            ])
            ->assertJsonFragment([
                'currency' => 'USD',
                'transaction_count' => 1,
                'sent_total' => 300,
                'received_total' => 0,
            ]);

        $this->actingAs($agency, 'sanctum')
            ->getJson('/api/me/transactions')
            ->assertOk()
            ->assertJsonCount(2, 'transactions')
            ->assertJsonFragment([
                'currency' => 'BDT',
                'transaction_count' => 1,
                'sent_total' => 0,
                'received_total' => 1200,
            ])
            ->assertJsonFragment([
                'currency' => 'USD',
                'transaction_count' => 1,
                'sent_total' => 0,
                'received_total' => 300,
            ]);

        $this->actingAs($unrelatedWorker, 'sanctum')
            ->getJson('/api/me/transactions')
            ->assertOk()
            ->assertJsonPath('transactions', [])
            ->assertJsonPath('totals_by_currency', []);
    }

    public function test_agency_to_worker_transaction_is_visible_to_both_parties_with_direction(): void
    {
        $agency = User::factory()->create(['role' => 'agency', 'name' => 'Paying Agency']);
        $worker = User::factory()->create(['role' => 'worker', 'name' => 'Paid Worker']);
        $payment = Payment::create([
            'user_id' => $worker->id,
            'agency_id' => $agency->id,
            'payer_id' => $agency->id,
            'recipient_worker_id' => $worker->id,
            'agency_name' => $agency->name,
            'purpose' => 'Worker advance',
            'amount' => 5000,
            'currency' => 'BDT',
            'payment_method' => 'SSLCommerz (bKash)',
            'transaction_id' => 'TXN-AGENCY-WORKER',
            'status' => 'verified',
            'payment_date' => now()->toDateString(),
        ]);

        foreach ([$agency, $worker] as $party) {
            $this->actingAs($party, 'sanctum')
                ->getJson('/api/me/transactions')
                ->assertOk()
                ->assertJsonCount(1, 'transactions')
                ->assertJsonPath('transactions.0.id', $payment->id)
                ->assertJsonPath('transactions.0.direction', 'Agency to worker')
                ->assertJsonPath('transactions.0.payer_name', 'Paying Agency')
                ->assertJsonPath('transactions.0.recipient_name', 'Paid Worker');
        }
    }

    public function test_success_callback_requires_sslcommerz_validation_and_records_once(): void
    {
        $worker = User::factory()->create(['role' => 'worker']);
        $agency = User::factory()->create(['role' => 'agency']);
        $payment = Payment::create([
            'user_id' => $worker->id,
            'agency_id' => $agency->id,
            'agency_name' => $agency->name,
            'purpose' => 'Agency processing fee',
            'amount' => 1200,
            'currency' => 'BDT',
            'payment_method' => 'SSLCommerz Gateway',
            'transaction_id' => 'DNK-SSL-VALID-1',
            'status' => 'pending',
            'payment_date' => now()->toDateString(),
        ]);

        Http::fake([
            '*' => Http::response([
                'status' => 'VALID',
                'tran_id' => $payment->transaction_id,
                'amount' => '1200.00',
                'currency' => 'BDT',
                'card_type' => 'bKash',
                'bank_tran_id' => 'BANK-VALID-1',
            ])
        ]);

        $callback = [
            'tran_id' => $payment->transaction_id,
            'val_id' => 'VAL-VALID-1',
        ];

        $this->post('/api/payments/sslcommerz/success', $callback)->assertStatus(302);
        $this->post('/api/payments/sslcommerz/success', $callback)->assertStatus(302);

        $this->assertSame('verified', $payment->fresh()->status);
        $this->assertSame($agency->id, $payment->fresh()->agency_id);
        $this->assertSame(1, Notification::where('user_id', $worker->id)->count());
    }

    public function test_invalid_success_callback_leaves_payment_pending(): void
    {
        $worker = User::factory()->create(['role' => 'worker']);
        $agency = User::factory()->create(['role' => 'agency']);
        $payment = Payment::create([
            'user_id' => $worker->id,
            'agency_id' => $agency->id,
            'agency_name' => $agency->name,
            'purpose' => 'Agency processing fee',
            'amount' => 1200,
            'currency' => 'BDT',
            'payment_method' => 'SSLCommerz Gateway',
            'transaction_id' => 'DNK-SSL-INVALID-1',
            'status' => 'pending',
            'payment_date' => now()->toDateString(),
        ]);

        Http::fake(['*' => Http::response(['status' => 'INVALID'])]);

        $this->post('/api/payments/sslcommerz/success', [
            'tran_id' => $payment->transaction_id,
            'val_id' => 'VAL-INVALID-1',
        ])->assertStatus(302);

        $this->assertSame('pending', $payment->fresh()->status);
        $this->assertSame(0, Notification::where('user_id', $worker->id)->count());
    }

    private function createVerifiedPayment(User $worker, User $agency, string $transactionId): Payment
    {
        return Payment::create([
            'user_id' => $worker->id,
            'agency_id' => $agency->id,
            'agency_name' => $agency->name,
            'purpose' => 'Agency processing fee',
            'amount' => 1200,
            'currency' => 'BDT',
            'payment_method' => 'SSLCommerz (bKash)',
            'transaction_id' => $transactionId,
            'status' => 'verified',
            'payment_date' => now()->toDateString(),
        ]);
    }
}
