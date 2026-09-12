<?php

namespace App\Services;

use App\Models\JobListing;
use App\Models\User;

class JobListingService
{
    /**
     * List job listings with optional search and verified filters.
     */
    public function listJobs(array $filters = [])
    {
        $query = JobListing::with('creator:id,name,agency,verification_status')->latest();

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('country', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['verified'])) {
            $query->where('verified', true);
        }

        return $query->get();
    }

    /**
     * Get a specific job with creator details.
     */
    public function getJob(JobListing $job): JobListing
    {
        return $job->load('creator:id,name,agency,verification_status');
    }

    /**
     * Create a new job listing for the agency.
     * The verified attribute is set based on the agency's verification status.
     */
    public function createJob(User $user, array $data): JobListing
    {
        if (empty($data['agency'])) {
            $data['agency'] = $user->agency ?: $user->name;
        }

        // A job is verified if the agency is verified
        $data['verified'] = ($user->verification_status === 'verified');

        return $user->postedJobs()->create($data);
    }

    /**
     * Update an existing job listing.
     */
    public function updateJob(JobListing $job, array $data): JobListing
    {
        $job->update($data);
        return $job;
    }

    /**
     * Delete an existing job listing.
     */
    public function deleteJob(JobListing $job): void
    {
        $job->delete();
    }

    /**
     * Synchronize verification status for all jobs posted by the agency.
     */
    public function syncAgencyJobsVerificationStatus(User $user, bool $verified): void
    {
        $user->postedJobs()->update(['verified' => $verified]);
    }
}
