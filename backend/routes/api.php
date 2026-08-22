<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\JobListingController;
use App\Http\Controllers\JobApplicationController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::apiResource('contracts', ContractController::class);
    Route::apiResource('documents', DocumentController::class);


    // Public — anyone can browse jobs
    Route::get('/jobs', [JobListingController::class, 'index']);
    Route::get('/jobs/{job}', [JobListingController::class, 'show']);

    Route::middleware('auth:sanctum')->group(function () {
        // ...existing routes...

        Route::post('/jobs', [JobListingController::class, 'store']);
        Route::patch('/jobs/{job}', [JobListingController::class, 'update']);
        Route::delete('/jobs/{job}', [JobListingController::class, 'destroy']);
    });


    // Public browsing
    Route::get('/jobs', [JobListingController::class, 'index']);
    Route::get('/jobs/{job}', [JobListingController::class, 'show']);

    Route::middleware('auth:sanctum')->group(function () {
        // ...existing routes...

        // Job listing management (agency)
        Route::post('/jobs', [JobListingController::class, 'store']);
        Route::patch('/jobs/{job}', [JobListingController::class, 'update']);
        Route::delete('/jobs/{job}', [JobListingController::class, 'destroy']);

        // Applications
        Route::post('/jobs/{job}/apply', [JobApplicationController::class, 'store']);
        Route::get('/applications/mine', [JobApplicationController::class, 'mine']);
        Route::get('/applications/for-agency', [JobApplicationController::class, 'forAgency']);
        Route::patch('/applications/{application}', [JobApplicationController::class, 'update']);
        Route::delete('/applications/{application}', [JobApplicationController::class, 'destroy']);

    });
    Route::get('/dashboard', function (\Illuminate\Http\Request $request) {
        return response()->json([
            'worker' => $request->user(),
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
