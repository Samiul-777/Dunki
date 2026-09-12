<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;

class VerificationService
{
    public function __construct(
        protected GeminiVerificationService $geminiService,
        protected JobListingService $jobListingService
    ) {}

    /**
     * Process document upload and run AI verification for worker or agency.
     */
    public function verifyUserDocument(User $user, UploadedFile $file): array
    {
        $path = $file->store('verifications', 'public');

        $user->update([
            'verification_document_path' => $path,
            'verification_status' => 'pending',
        ]);

        $result = $this->geminiService->verifyDocument($user, $path);

        $isAuthentic = !empty($result['authentic']);

        $user->update([
            'verification_status' => $isAuthentic ? 'verified' : 'rejected',
            'verification_note' => $result['reason'] ?? ($isAuthentic ? 'Verification approved.' : 'Verification rejected.'),
            'verified_at' => $isAuthentic ? now() : null,
        ]);

        // If the verified user is an agency, mark all of their job listings as verified!
        if ($user->role === 'agency') {
            $this->jobListingService->syncAgencyJobsVerificationStatus($user, $isAuthentic);
        }

        // Add or update verification document in user's documents
        $docType = $result['document_type'] ?? null;
        $name = ($docType && !in_array($docType, ['Unknown', 'Unsupported Format']))
            ? "Registration Verification ({$docType})"
            : ($user->role === 'agency' ? 'Official Agency License' : 'Registration Identity Verification');

        $user->documents()->updateOrCreate(
            ['type' => 'verification'],
            [
                'name' => $name,
                'status' => $isAuthentic ? 'complete' : 'missing',
                'file_path' => $path,
            ]
        );

        return [
            'status' => $user->verification_status,
            'note' => $user->verification_note,
            'details' => $result,
        ];
    }

    /**
     * Explicitly bypass verification, marking user as unverified.
     */
    public function bypassVerification(User $user): array
    {
        $user->update([
            'verification_status' => 'unverified',
            'verification_note' => 'Verification skipped by user. Account is unverified.',
            'verified_at' => null,
        ]);

        if ($user->role === 'agency') {
            $this->jobListingService->syncAgencyJobsVerificationStatus($user, false);
        }

        return [
            'status' => 'unverified',
            'note' => 'Verification skipped by user. Account is unverified.',
        ];
    }

    /**
     * Get the current verification status for the user.
     */
    public function getStatus(User $user): array
    {
        return [
            'status' => $user->verification_status ?: 'unverified',
            'note' => $user->verification_note,
            'verified_at' => $user->verified_at,
        ];
    }
}
