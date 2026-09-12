<?php

namespace App\Http\Controllers;

use App\Services\VerificationService;
use Illuminate\Http\Request;

class VerificationController extends Controller
{
    public function __construct(
        protected VerificationService $verificationService
    ) {}

    /**
     * Upload identification or agency license document for AI verification.
     */
    public function store(Request $request)
    {
        $request->validate([
            'document' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:10240', // 10MB
        ]);

        $result = $this->verificationService->verifyUserDocument(
            $request->user(),
            $request->file('document')
        );

        return response()->json($result);
    }

    /**
     * Skip/bypass document verification.
     * Sets user verification status to 'unverified'.
     */
    public function bypass(Request $request)
    {
        $result = $this->verificationService->bypassVerification($request->user());

        return response()->json($result);
    }

    /**
     * Get current verification status for the authenticated user.
     */
    public function status(Request $request)
    {
        $result = $this->verificationService->getStatus($request->user());

        return response()->json($result);
    }
}
