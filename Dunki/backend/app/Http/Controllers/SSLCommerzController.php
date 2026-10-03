<?php

namespace App\Http\Controllers;

use App\Services\SSLCommerzService;
use Illuminate\Http\Request;

class SSLCommerzController extends Controller
{
    public function __construct(
        protected SSLCommerzService $sslCommerzService
    ) {
    }

    /**
     * Authenticated endpoint to initialize an SSLCommerz payment session.
     */
    public function initiate(Request $request)
    {
        $payer = $request->user();
        if (!in_array($payer->role, ['worker', 'agency'], true)) {
            return response()->json(['message' => 'Only workers and agencies can initiate payments.'], 403);
        }

        $data = $request->validate([
            'purpose' => 'required|string|max:255',
            'amount' => 'required|numeric|min:1',
            'agency_id' => $payer->role === 'worker' ? 'required|integer|exists:users,id' : 'prohibited',
            'worker_id' => $payer->role === 'agency' ? 'required|integer|exists:users,id' : 'prohibited',
            'notes' => 'nullable|string|max:1000',
        ]);

        $result = $this->sslCommerzService->initiatePayment($payer, $data);

        return response()->json($result, $result['status'] === 'error' ? 502 : 200);
    }

    /**
     * Callback when payment succeeds on SSLCommerz gateway.
     */
    public function success(Request $request)
    {
        $result = $this->sslCommerzService->handleSuccess($request);

        return redirect()->away($result['redirect_url']);
    }

    /**
     * Callback when payment fails on SSLCommerz gateway.
     */
    public function fail(Request $request)
    {
        $result = $this->sslCommerzService->handleFail($request);

        return redirect()->away($result['redirect_url']);
    }

    /**
     * Callback when user cancels payment on gateway.
     */
    public function cancel(Request $request)
    {
        $result = $this->sslCommerzService->handleCancel($request);

        return redirect()->away($result['redirect_url']);
    }

    /**
     * IPN (Instant Payment Notification) Webhook.
     */
    public function ipn(Request $request)
    {
        $result = $this->sslCommerzService->handleSuccess($request);

        return response()->json(['status' => 'IPN received', 'data' => $result]);
    }

    /**
     * Interactive Dunki SSLCommerz Checkout Sandbox view.
     */
    public function simulateCheckout(Request $request)
    {
        $tranId = $request->query('tran_id');
        if (!$tranId) {
            return response('Missing tran_id query parameter', 400);
        }

        if (!$this->sslCommerzService->hasValidSandboxToken($tranId, $request->query('token'))) {
            return response('Sandbox checkout link is invalid or expired.', 403);
        }

        $html = $this->sslCommerzService->renderSimulatorHtml($tranId, $request->query('token'));

        return response($html, 200)->header('Content-Type', 'text/html');
    }
}
