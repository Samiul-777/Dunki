<?php

namespace App\Http\Controllers;

use App\Models\JobListing;
use App\Services\JobListingService;
use Illuminate\Http\Request;

class JobListingController extends Controller
{
    public function __construct(
        protected JobListingService $jobListingService
    ) {}

    // READ — public, anyone can browse
    public function index(Request $request)
    {
        $filters = [
            'search' => $request->input('search'),
            'verified' => $request->boolean('verified'),
        ];

        $jobs = $this->jobListingService->listJobs($filters);

        return response()->json($jobs);
    }

    public function show(JobListing $job)
    {
        return response()->json($this->jobListingService->getJob($job));
    }

    // CREATE — only agency-role users can post jobs
    public function store(Request $request)
    {
        if ($request->user()->role !== 'agency') {
            return response()->json(['message' => 'Only agencies can post job listings.'], 403);
        }

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'criteria' => 'required|string',
            'country' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'salary' => 'required|string|max:255',
            'agency' => 'nullable|string|max:255',
        ]);

        $job = $this->jobListingService->createJob($request->user(), $data);

        return response()->json($job, 201);
    }

    // UPDATE — only the agency that created it can edit
    public function update(Request $request, JobListing $job)
    {
        if ($job->creator_id !== $request->user()->id) {
            return response()->json(['message' => 'You can only edit your own listings.'], 403);
        }

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'country' => 'sometimes|string|max:255',
            'city' => 'sometimes|string|max:255',
            'salary' => 'sometimes|string|max:255',
            'agency' => 'sometimes|string|max:255',
            'verified' => 'sometimes|boolean',
        ]);

        $job = $this->jobListingService->updateJob($job, $data);

        return response()->json($job);
    }

    // DELETE — only the creator can delete
    public function destroy(Request $request, JobListing $job)
    {
        if ($job->creator_id !== $request->user()->id) {
            return response()->json(['message' => 'You can only delete your own listings.'], 403);
        }

        $this->jobListingService->deleteJob($job);

        return response()->json(['message' => 'Job listing deleted']);
    }
}
