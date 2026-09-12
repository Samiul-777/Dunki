<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use App\Models\JobListing;
use App\Services\JobApplicationService;
use Illuminate\Http\Request;

class JobApplicationController extends Controller
{
    public function __construct(
        protected JobApplicationService $jobApplicationService
    ) {}

    // CREATE — worker applies, with optional document upload
    public function store(Request $request, JobListing $job)
    {
        if ($request->user()->role !== 'worker') {
            return response()->json(['message' => 'Only workers can apply to jobs.'], 403);
        }

        $data = $request->validate([
            'note' => 'nullable|string|max:1000',
            'document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120', // 5MB
        ]);

        $application = $this->jobApplicationService->apply(
            $request->user(),
            $job,
            $data,
            $request->file('document')
        );

        return response()->json($application, 201);
    }

    // READ — worker: all of their own applications, with job info + status
    public function mine(Request $request)
    {
        return response()->json(
            $this->jobApplicationService->getWorkerApplications($request->user())
        );
    }

    // READ — agency: every application across all of their posted jobs with applicant verification status
    public function forAgency(Request $request)
    {
        if ($request->user()->role !== 'agency') {
            return response()->json(['message' => 'Only agencies can view this.'], 403);
        }

        return response()->json(
            $this->jobApplicationService->getAgencyApplications($request->user())
        );
    }

    // UPDATE — agency accepts/rejects
    public function update(Request $request, JobApplication $application)
    {
        if ($application->job->creator_id !== $request->user()->id) {
            return response()->json(['message' => 'Not your listing.'], 403);
        }

        $data = $request->validate(['status' => 'required|in:pending,accepted,rejected']);
        $updated = $this->jobApplicationService->updateStatus($application, $data['status']);

        return response()->json($updated);
    }

    // DELETE — worker withdraws
    public function destroy(Request $request, JobApplication $application)
    {
        if ($application->applicant_id !== $request->user()->id) {
            return response()->json(['message' => 'Not your application.'], 403);
        }

        $this->jobApplicationService->withdraw($application);

        return response()->json(['message' => 'Application withdrawn']);
    }
}
