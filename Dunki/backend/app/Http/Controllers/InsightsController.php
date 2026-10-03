<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\Payment;

class InsightsController extends Controller
{
    public function index(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Insights are available to administrators only.'], 403);
        }

        $usingApplicationView = false;
        $usingDestinationProcedure = false;

        if (DB::getDriverName() === 'mysql') {
            try {
                $applicationsWithDetails = DB::select('SELECT * FROM v_dunki_application_overview');
                $usingApplicationView = true;
            } catch (\Throwable $e) {
                $applicationsWithDetails = $this->applicationDetailsFallback();
            }

            try {
                $destinationSummary = DB::select('CALL sp_dunki_destination_summary()');
                $usingDestinationProcedure = true;
            } catch (\Throwable $e) {
                $destinationSummary = $this->destinationSummaryFallback();
            }
        } else {
            $applicationsWithDetails = $this->applicationDetailsFallback();
            $destinationSummary = $this->destinationSummaryFallback();
        }

        $historyAvailable = false;
        $triggerActive = false;
        if (DB::getDriverName() === 'mysql') {
            $historyAvailable = (int) (DB::selectOne(
                'SELECT COUNT(*) AS table_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
                ['job_application_status_history']
            )->table_count ?? 0) > 0;

            $triggerActive = (int) (DB::selectOne(
                'SELECT COUNT(*) AS trigger_count FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = ?',
                ['trg_job_application_status_history']
            )->trigger_count ?? 0) > 0;
        }
        $transactions = Schema::hasTable('payments') && Schema::hasColumn('payments', 'agency_id')
            ? Payment::query()
                ->with(['user:id,name', 'agency:id,name,agency', 'payer:id,name'])
                ->where('status', 'verified')
                ->whereNotNull('agency_id')
                ->latest('payment_date')
                ->get()
                ->map(fn(Payment $payment) => [
                    'id' => $payment->id,
                    'worker_name' => $payment->user?->name,
                    'agency_name' => $payment->agency?->agency ?: $payment->agency?->name,
                    'direction' => $payment->payer_id && $payment->payer_id === $payment->agency_id
                        ? 'Agency to worker'
                        : 'Worker to agency',
                    'payer_name' => $payment->payer?->name ?: $payment->user?->name,
                    'recipient_name' => $payment->payer_id && $payment->payer_id === $payment->agency_id
                        ? $payment->user?->name
                        : ($payment->agency?->agency ?: $payment->agency?->name),
                    'purpose' => $payment->purpose,
                    'amount' => $payment->amount,
                    'currency' => $payment->currency,
                    'payment_method' => $payment->payment_method,
                    'transaction_id' => $payment->transaction_id,
                    'bank_tran_id' => $payment->bank_tran_id,
                    'payment_date' => $payment->payment_date,
                ])
                ->values()
            : [];

        return response()->json([
            'applications_with_details' => $applicationsWithDetails,

            // LEFT JOIN — every job listing, including ones with zero applications
            'jobs_with_application_count' => DB::select("
                SELECT jobs_listings.id, jobs_listings.title,
                       COUNT(job_applications.id) AS application_count
                FROM jobs_listings
                LEFT JOIN job_applications ON job_applications.job_listing_id = jobs_listings.id
                GROUP BY jobs_listings.id, jobs_listings.title
            "),

            // RIGHT JOIN — every user, including agencies who haven't posted a job yet
            // (SQLite 3.39+ supports RIGHT JOIN natively)
            'agencies_and_their_jobs' => DB::select("
                SELECT users.name AS agency_name, jobs_listings.title AS job_title
                FROM jobs_listings
                RIGHT JOIN users ON jobs_listings.creator_id = users.id
                WHERE users.role = 'agency'
            "),

            // AGGREGATE + GROUP BY — application count per status
            'application_status_breakdown' => DB::select("
                SELECT status, COUNT(*) AS total
                FROM job_applications
                GROUP BY status
            "),

            // AGGREGATE + GROUP BY — number of jobs posted per country
            'jobs_per_country' => DB::select("
                SELECT country, COUNT(*) AS total_jobs
                FROM jobs_listings
                GROUP BY country
            "),

            'destination_summary' => $destinationSummary,
            'transactions' => $transactions,
            'application_status_history' => $historyAvailable
                ? DB::select('SELECT * FROM job_application_status_history ORDER BY changed_at DESC LIMIT 100')
                : [],
            'database_method_status' => [
                'driver' => DB::getDriverName(),
                'view' => [
                    'name' => 'v_dunki_application_overview',
                    'active' => $usingApplicationView,
                ],
                'procedure' => [
                    'name' => 'sp_dunki_destination_summary',
                    'active' => $usingDestinationProcedure,
                ],
                'trigger' => [
                    'name' => 'trg_job_application_status_history',
                    'active' => $triggerActive,
                ],
                'transaction' => [
                    'name' => 'Job application status update',
                    'active' => true,
                ],
            ],

            // SUBQUERY — workers who have applied to more jobs than average
            'above_average_applicants' => DB::select("
                SELECT users.name, COUNT(job_applications.id) AS application_count
                FROM users
                JOIN job_applications ON job_applications.applicant_id = users.id
                GROUP BY users.id, users.name
                HAVING COUNT(job_applications.id) > (
                    SELECT AVG(sub_count) FROM (
                        SELECT COUNT(*) AS sub_count
                        FROM job_applications
                        GROUP BY applicant_id
                    ) AS applicant_application_counts
                )
            "),

        ]);
    }

    private function applicationDetailsFallback(): array
    {
        return DB::select("
            SELECT job_applications.id, job_applications.status,
                   jobs_listings.title AS job_title,
                   users.name AS applicant_name
            FROM job_applications
            JOIN jobs_listings ON job_applications.job_listing_id = jobs_listings.id
            JOIN users ON job_applications.applicant_id = users.id
        ");
    }

    private function destinationSummaryFallback(): array
    {
        return DB::select("
            SELECT COALESCE(NULLIF(jobs_listings.country, ''), 'Unknown') AS destination,
                   COUNT(DISTINCT jobs_listings.id) AS job_count,
                   COUNT(job_applications.id) AS application_count,
                   COUNT(DISTINCT CASE WHEN jobs_listings.verified = 1 THEN jobs_listings.id END) AS verified_job_count
            FROM jobs_listings
            LEFT JOIN job_applications ON job_applications.job_listing_id = jobs_listings.id
            GROUP BY COALESCE(NULLIF(jobs_listings.country, ''), 'Unknown')
            ORDER BY job_count DESC, destination ASC
        ");
    }
}
