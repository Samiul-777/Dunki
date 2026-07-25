<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

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
