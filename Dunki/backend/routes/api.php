<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\JobListingController;
use App\Http\Controllers\JobApplicationController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\AIJobController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SSLCommerzController;
use App\Http\Controllers\AssistantController;
use App\Http\Controllers\ComplaintController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InsightsController;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Health check with the deployed commit SHA (written to REVISION by the CI/CD pipeline)
Route::get('/health', function () {
    try {
        \Illuminate\Support\Facades\DB::select('select 1');
        $database = 'ok';
    } catch (\Throwable $e) {
        $database = 'error';
    }

    $revision = base_path('REVISION');

    return response()->json([
        'status' => $database === 'ok' ? 'ok' : 'degraded',
        'database' => $database,
        'commit' => is_file($revision) ? trim(file_get_contents($revision)) : 'unknown',
        'time' => now()->toIso8601String(),
    ]);
});

// Public authentication routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public job browsing
Route::get('/jobs', [JobListingController::class, 'index']);
Route::get('/jobs/{job}', [JobListingController::class, 'show']);

// SSLCommerz Gateway Callbacks (Publicly accessible for gateway redirects & IPN webhooks)
Route::match(['get', 'post'], '/payments/sslcommerz/success', [SSLCommerzController::class, 'success']);
Route::match(['get', 'post'], '/payments/sslcommerz/fail', [SSLCommerzController::class, 'fail']);
Route::match(['get', 'post'], '/payments/sslcommerz/cancel', [SSLCommerzController::class, 'cancel']);
Route::post('/payments/sslcommerz/ipn', [SSLCommerzController::class, 'ipn']);
Route::get('/payments/sslcommerz/simulate-checkout', [SSLCommerzController::class, 'simulateCheckout']);

// RAG AI Assistant routes (Accessible publicly or with optional token auth)
Route::post('/assistant/chat', function (Request $request, AssistantController $controller) {
    // If bearer token is provided, attach the sanctum user
    if ($user = auth('sanctum')->user()) {
        $request->setUserResolver(fn() => $user);
    }
    return $controller->chat($request);
});
Route::get('/assistant/suggestions', [AssistantController::class, 'suggestions']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/me/destination', [AuthController::class, 'destination']);
    Route::put('/me/destination', [AuthController::class, 'updateDestination']);
    Route::put('/me/password', [AuthController::class, 'changePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Contracts (Migrant workers can view; agencies can issue)
    Route::get('/contracts-workers', [ContractController::class, 'availableWorkers']);
    Route::apiResource('contracts', ContractController::class);

    // Documents
    Route::get('/documents/{document}/file', [DocumentController::class, 'file']);
    Route::apiResource('documents', DocumentController::class);

    // Payments / Recruitment Cost Ledger & SSLCommerz
    Route::get('/agencies/search', [PaymentController::class, 'searchAgencies']);
    Route::get('/workers/search', [PaymentController::class, 'searchWorkers']);
    Route::get('/me/transactions', [PaymentController::class, 'transactions']);
    Route::post('/payments/initiate-sslcommerz', [SSLCommerzController::class, 'initiate']);
    Route::apiResource('payments', PaymentController::class);
    Route::get('/payments-summary', [PaymentController::class, 'summary']);

    // Complaints & Grievance Redressal
    Route::apiResource('complaints', ComplaintController::class);
    Route::post('/complaints/{complaint}/escalate', [ComplaintController::class, 'escalate']);

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

    // Notifications
    Route::patch('/notifications/{notification}/read', function (Notification $notification, Request $request) {
        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $notification->update(['is_read' => true]);
        return response()->json($notification);
    });

    // Dynamic Live Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Admin-only recruitment and application insights
    Route::get('/insights', [InsightsController::class, 'index']);
});
