<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\JobListingController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\AIJobController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public authentication routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public job browsing
Route::get('/jobs', [JobListingController::class, 'index']);
Route::get('/jobs/{job}', [JobListingController::class, 'show']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Resources
    Route::apiResource('contracts', ContractController::class);
    Route::apiResource('documents', DocumentController::class);

    // Job listing management (Agency)
    Route::post('/jobs', [JobListingController::class, 'store']);
    Route::patch('/jobs/{job}', [JobListingController::class, 'update']);
    Route::delete('/jobs/{job}', [JobListingController::class, 'destroy']);

    // AI Job Assistant endpoints (Agency)
    Route::post('/ai/generate-job', [AIJobController::class, 'generate']);
    Route::post('/ai/auto-post-job', [AIJobController::class, 'autoPost']);

    // Applications
    Route::post('/jobs/{job}/apply', [JobApplicationController::class, 'store']);
    Route::get('/applications/mine', [JobApplicationController::class, 'mine']);
    Route::get('/applications/for-agency', [JobApplicationController::class, 'forAgency']);
    Route::patch('/applications/{application}', [JobApplicationController::class, 'update']);
    Route::delete('/applications/{application}', [JobApplicationController::class, 'destroy']);

    // Verification
    Route::post('/verification', [VerificationController::class, 'store']);
    Route::post('/verification/bypass', [VerificationController::class, 'bypass']);
    Route::get('/verification/status', [VerificationController::class, 'status']);

    // Worker Dashboard
    Route::get('/dashboard', function (Request $request, \App\Services\DocumentService $documentService) {
        return response()->json([
            'worker' => $request->user(),
            'documentChecklist' => $documentService->getUserDocuments($request->user()),
            'journeyStages' => [
                ['key' => 'applied', 'label' => 'Applied', 'status' => 'done'],
                ['key' => 'reviewed', 'label' => 'Agency Review', 'status' => 'done'],
                ['key' => 'contract', 'label' => 'Contract Verified', 'status' => 'done'],
                ['key' => 'medical', 'label' => 'Medical', 'status' => 'current'],
                ['key' => 'visa', 'label' => 'Visa', 'status' => 'pending'],
                ['key' => 'travel', 'label' => 'Travel', 'status' => 'pending'],
            ],
        ]);
    });
});

