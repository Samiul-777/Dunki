<?php

namespace App\Services;

use App\Models\JobApplication;
use App\Models\JobListing;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class JobApplicationService
{
    /**
     * Create a new job application.
     */
    public function apply(User $user, JobListing $job, array $data, ?UploadedFile $documentFile = null): JobApplication
    {
        $existing = $job->applications()->where('applicant_id', $user->id)->first();
        if ($existing) {
            throw ValidationException::withMessages([
                'application' => ['You have already applied to this job listing.'],
            ]);
        }

        $path = null;
        if ($documentFile) {
            $path = $documentFile->store('applications', 'public');
        }

        return $job->applications()->create([
            'applicant_id' => $user->id,
            'note' => $data['note'] ?? null,
            'document_path' => $path,
        ]);
    }

    /**
     * Retrieve all applications submitted by a worker.
     */
    public function getWorkerApplications(User $user)
    {
        return $user->applications()
            ->with([
                'job' => function ($q) {
                    $q->with('creator:id,name,agency,verification_status');
                }
            ])
            ->latest()
            ->get();
    }

    /**
     * Retrieve all applications for jobs posted by an agency.
     * Includes applicant identity and verification status.
     */
    public function getAgencyApplications(User $user)
    {
        return JobApplication::whereHas('job', function ($q) use ($user) {
            $q->where('creator_id', $user->id);
        })
            ->with([
                'job:id,title,agency,verified',
                'applicant:id,name,email,phone,verification_status',
            ])
            ->latest()
            ->get();
    }

    /**
     * Update application status (accepted / rejected).
     *
     * MySQL-only. Uses a manual transaction with a row lock (FOR UPDATE).
     * If a transaction is already open (e.g. the caller wrapped this call),
     * a SAVEPOINT is used instead, because START TRANSACTION inside an open
     * transaction would implicitly commit the outer one in MySQL.
     */
    public function updateStatus(JobApplication $application, string $status): JobApplication
    {
        $nested = DB::connection()->getPdo()->inTransaction();
        $savepoint = 'job_application_status';

        DB::unprepared($nested ? "SAVEPOINT {$savepoint}" : 'START TRANSACTION');

        try {
            // Lock the row so concurrent updates to this application wait their turn.
            $current = DB::selectOne(
                'SELECT id FROM job_applications WHERE id = ? FOR UPDATE',
                [$application->id]
            );

            if (!$current) {
                throw new \RuntimeException('Application not found during status update.');
            }

            // Raw SQL bypasses Eloquent, so updated_at must be set manually.
            DB::update(
                'UPDATE job_applications SET status = ?, updated_at = ? WHERE id = ?',
                [$status, now()->toDateTimeString(), $application->id]
            );

            $updated = DB::selectOne(
                'SELECT * FROM job_applications WHERE id = ?',
                [$application->id]
            );

            DB::unprepared($nested ? "RELEASE SAVEPOINT {$savepoint}" : 'COMMIT');

            // Sync the model with the fresh DB row (true = also update "original" values).
            $application->setRawAttributes((array) $updated, true);

            return $application;
        } catch (\Throwable $e) {
            try {
                if ($nested) {
                    DB::unprepared("ROLLBACK TO SAVEPOINT {$savepoint}");
                    DB::unprepared("RELEASE SAVEPOINT {$savepoint}");
                } else {
                    DB::unprepared('ROLLBACK');
                }
            } catch (\Throwable $rollbackError) {
                // Don't let a failed rollback hide the original error.
                report($rollbackError);
            }

            throw $e;
        }
    }

    /**
     * Withdraw / delete application.
     */
    public function withdraw(JobApplication $application): void
    {
        $application->delete();
    }
}
