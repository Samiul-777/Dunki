<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\User;
use App\Services\ContractService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SSLCommerzService
{
    protected string $storeId;
    protected string $storePasswd;
    protected bool $isSandbox;
    protected string $apiUrl;
    protected string $validationUrl;
    protected string $frontendUrl;

    public function __construct(protected ContractService $contractService)
    {
        $this->storeId = env('SSLCOMMERZ_STORE_ID', 'testbox');
        $this->storePasswd = env('SSLCOMMERZ_STORE_PASSWORD', 'qwerty');
        $this->isSandbox = (bool) env('SSLCOMMERZ_IS_SANDBOX', true);
        $this->frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');

        if ($this->isSandbox) {
            $this->apiUrl = 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';
            $this->validationUrl = 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php';
        } else {
            $this->apiUrl = 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';
            $this->validationUrl = 'https://validator.sslcommerz.com/validator/api/validationserverAPI.php';
        }
    }

    /**
     * Initiate an official SSLCommerz payment session for a migrant worker fee.
     */
    public function initiatePayment(User $user, array $data): array
    {
        $agencyPayer = $user->role === 'agency';
        if (!in_array($user->role, ['worker', 'agency'], true)) {
            throw ValidationException::withMessages([
                'role' => ['Only workers and agencies can initiate payments.'],
            ]);
        }

        $agency = $agencyPayer
            ? $user
            : User::query()->where('role', 'agency')->find($data['agency_id'] ?? null);
        $worker = $agencyPayer
            ? User::query()->where('role', 'worker')->find($data['worker_id'] ?? null)
            : $user;

        if (!$agency || !$worker || ($agencyPayer && !$this->contractService->isRelevantWorker($agency, $worker))) {
            throw ValidationException::withMessages([
                $agencyPayer ? 'worker_id' : 'agency_id' => [
                    $agencyPayer
                    ? 'Choose a worker who applied to your jobs or has a contract with your agency.'
                    : 'Select a registered agency to receive this payment.',
                ],
            ]);
        }

        $tranId = 'DNK-SSL-' . strtoupper(Str::random(10));
        $amount = (float) $data['amount'];
        $purpose = $data['purpose'];
        $agencyName = $agency->agency ?: $agency->name;
        $notes = $data['notes'] ?? 'Paid via SSLCommerz Gateway';

        // 1. Create a pending payment record in Dunki ledger
        $payment = Payment::create([
            'user_id' => $worker->id,
            'agency_id' => $agency->id,
            'payer_id' => $user->id,
            'recipient_worker_id' => $agencyPayer ? $worker->id : null,
            'agency_name' => $agencyName,
            'purpose' => $purpose,
            'amount' => $amount,
            'currency' => 'BDT',
            'payment_method' => 'SSLCommerz Gateway',
            'transaction_id' => $tranId,
            'status' => 'pending',
            'payment_date' => now()->toDateString(),
            'notes' => $notes,
        ]);

        $baseUrl = url('/api/payments/sslcommerz');

        $postData = [
            'store_id' => $this->storeId,
            'store_passwd' => $this->storePasswd,
            'total_amount' => $amount,
            'currency' => 'BDT',
            'tran_id' => $tranId,
            'success_url' => "{$baseUrl}/success",
            'fail_url' => "{$baseUrl}/fail",
            'cancel_url' => "{$baseUrl}/cancel",
            'ipn_url' => "{$baseUrl}/ipn",
            'cus_name' => $user->name ?: 'Migrant Worker',
            'cus_email' => $user->email ?: 'worker@dunki.test',
            'cus_add1' => $user->destination ?: 'Dhaka',
            'cus_city' => 'Dhaka',
            'cus_country' => 'Bangladesh',
            'cus_phone' => $user->phone ?: '+8801700000000',
            'shipping_method' => 'NO',
            'product_name' => $purpose,
            'product_category' => 'Overseas Recruitment & Migration Service',
            'product_profile' => 'general',
        ];

        // 2. Try requesting SSLCommerz Sandbox API
        try {
            $response = Http::asForm()->timeout(12)->post($this->apiUrl, $postData);

            if ($response->successful()) {
                $sslData = $response->json();
                if (isset($sslData['status']) && $sslData['status'] === 'SUCCESS' && !empty($sslData['GatewayPageURL'])) {
                    return [
                        'status' => 'success',
                        'gateway_url' => $sslData['GatewayPageURL'],
                        'tran_id' => $tranId,
                        'payment_id' => $payment->id,
                        'session_key' => $sslData['sessionkey'] ?? null,
                    ];
                }
            }

            Log::warning('SSLCommerz gateway response did not return SUCCESS status:', [
                'body' => $response->body() ?? 'empty',
            ]);
        } catch (\Throwable $e) {
            Log::info('SSLCommerz external API unreachable; using Dunki Sandbox Gateway Simulator: ' . $e->getMessage());
        }

        if (!$this->isSandbox) {
            $payment->update([
                'status' => 'disputed',
                'notes' => ($payment->notes ? $payment->notes . ' | ' : '') . 'SSLCommerz checkout session could not be created.',
            ]);

            return [
                'status' => 'error',
                'message' => 'SSLCommerz could not start checkout. Please try again later.',
            ];
        }

        // Keep the interactive simulator available only in sandbox mode.
        $simulatorToken = $this->simulatorToken($tranId);
        $simulatorUrl = url('/api/payments/sslcommerz/simulate-checkout?' . http_build_query([
            'tran_id' => $tranId,
            'token' => $simulatorToken,
        ]));

        return [
            'status' => 'success',
            'gateway_url' => $simulatorUrl,
            'tran_id' => $tranId,
            'payment_id' => $payment->id,
            'is_sandbox_fallback' => true,
        ];
    }

    /**
     * Process successful payment callback from SSLCommerz.
     */
    public function handleSuccess(Request $request): array
    {
        $tranId = $request->input('tran_id');
        $valId = $request->input('val_id');
        $cardType = $request->input('card_type', 'Online Gateway (bKash/Nagad/Cards)');
        $bankTranId = $request->input('bank_tran_id');

        if (!$tranId) {
            return [
                'success' => false,
                'message' => 'Transaction ID missing from gateway callback',
                'redirect_url' => "{$this->frontendUrl}/payments?payment_status=failed&reason=missing_tran_id",
            ];
        }

        $payment = Payment::where('transaction_id', $tranId)->first();

        if (!$payment) {
            return [
                'success' => false,
                'message' => 'Payment transaction not found in Dunki registry',
                'redirect_url' => "{$this->frontendUrl}/payments?payment_status=failed&reason=transaction_not_found",
            ];
        }

        if ($payment->status === 'verified') {
            return [
                'success' => true,
                'payment' => $payment,
                'redirect_url' => $this->successRedirect($payment),
            ];
        }

        if ($payment->status !== 'pending') {
            return [
                'success' => false,
                'message' => 'Payment is not awaiting gateway confirmation.',
                'redirect_url' => "{$this->frontendUrl}/payments?payment_status=failed&reason=payment_not_pending",
            ];
        }

        $simulatorToken = $request->input('sandbox_token');
        $validatedBySimulator = $this->hasValidSandboxToken($tranId, $simulatorToken);
        $validatedByApi = false;
        $validationData = null;

        if (!$validatedBySimulator && $valId && $this->storeId && $this->storePasswd) {
            try {
                $valResponse = Http::timeout(8)->get($this->validationUrl, [
                    'val_id' => $valId,
                    'store_id' => $this->storeId,
                    'store_passwd' => $this->storePasswd,
                    'format' => 'json',
                ]);

                if ($valResponse->successful()) {
                    $valData = $valResponse->json();
                    if (
                        in_array(($valData['status'] ?? ''), ['VALID', 'VALIDATED'], true)
                        && ($valData['tran_id'] ?? null) === $tranId
                        && number_format((float) ($valData['amount'] ?? 0), 2, '.', '') === number_format((float) $payment->amount, 2, '.', '')
                        && strtoupper((string) ($valData['currency'] ?? '')) === strtoupper((string) $payment->currency)
                    ) {
                        $validatedByApi = true;
                        $validationData = $valData;
                        if (!empty($valData['card_type']))
                            $cardType = $valData['card_type'];
                        if (!empty($valData['bank_tran_id']))
                            $bankTranId = $valData['bank_tran_id'];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('SSLCommerz validation API request failed: ' . $e->getMessage());
            }
        }

        if (!$validatedByApi && !$validatedBySimulator) {
            return [
                'success' => false,
                'message' => 'SSLCommerz could not validate this payment.',
                'redirect_url' => "{$this->frontendUrl}/payments?payment_status=failed&reason=validation_failed",
            ];
        }

        $verifiedAmount = $validatedBySimulator
            ? (float) $request->input('amount', 0)
            : (float) ($validationData['amount'] ?? 0);
        if (number_format($verifiedAmount, 2, '.', '') !== number_format((float) $payment->amount, 2, '.', '')) {
            return [
                'success' => false,
                'message' => 'The confirmed amount does not match the payment request.',
                'redirect_url' => "{$this->frontendUrl}/payments?payment_status=failed&reason=amount_mismatch",
            ];
        }

        if ($validatedBySimulator) {
            $bankTranId = $bankTranId ?: 'BNK-' . strtoupper(Str::random(8));
        }

        $transactionStart = DB::getDriverName() === 'sqlite' ? 'BEGIN TRANSACTION' : 'START TRANSACTION';
        $lockClause = in_array(DB::getDriverName(), ['mysql', 'mariadb'], true) ? ' FOR UPDATE' : '';
        $nestedTransaction = DB::connection()->getPdo()->inTransaction();
        $savepoint = 'sslc_payment_success';
        $commitSql = $nestedTransaction ? "RELEASE SAVEPOINT {$savepoint}" : 'COMMIT';
        $rollbackRawTransaction = static function () use ($nestedTransaction, $savepoint): void {
            if ($nestedTransaction) {
                DB::unprepared("ROLLBACK TO SAVEPOINT {$savepoint}");
                DB::unprepared("RELEASE SAVEPOINT {$savepoint}");
                return;
            }

            DB::unprepared('ROLLBACK');
        };
        $wasRecorded = false;
        $notPending = false;

        DB::unprepared($nestedTransaction ? "SAVEPOINT {$savepoint}" : $transactionStart);
        try {
            $lockedPayment = DB::selectOne(
                'SELECT * FROM payments WHERE id = ?' . $lockClause,
                [$payment->id]
            );

            if (!$lockedPayment) {
                throw new \RuntimeException('Payment disappeared during gateway confirmation.');
            }

            if ($lockedPayment->status === 'verified') {
                DB::unprepared($commitSql);
            } elseif ($lockedPayment->status !== 'pending') {
                $rollbackRawTransaction();
                $notPending = true;
            } else {
                $verifiedAt = now()->toDateTimeString();
                $validationReference = $valId ?: 'SIM-' . strtoupper(Str::random(10));
                $note = ($lockedPayment->notes ? $lockedPayment->notes . ' | ' : '')
                    . "Verified by SSLCommerz. Trx: {$bankTranId}"
                    . ($validatedByApi ? ' (API Validated)' : ' (Sandbox Simulator)');

                DB::update(
                    'UPDATE payments SET status = ?, payment_method = ?, card_type = ?, val_id = ?, bank_tran_id = ?, notes = ?, updated_at = ? WHERE id = ?',
                    ['verified', "SSLCommerz ({$cardType})", $cardType, $validationReference, $bankTranId, $note, $verifiedAt, $lockedPayment->id]
                );

                $worker = DB::selectOne('SELECT name FROM users WHERE id = ?', [$lockedPayment->user_id]);
                $workerName = $worker?->name ?: 'the worker';
                $notificationTime = now()->toDateTimeString();

                DB::insert(
                    'INSERT INTO notifications (user_id, title, detail, level, link, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                        $lockedPayment->user_id,
                        'Payment Verified: ৳' . number_format((float) $lockedPayment->amount) . ' via SSLCommerz',
                        "Your official fee payment for '{$lockedPayment->purpose}' was validated. Bank Ref: {$bankTranId}.",
                        'verified',
                        '/payments',
                        $notificationTime,
                        $notificationTime,
                    ]
                );

                if ($lockedPayment->payer_id && (int) $lockedPayment->payer_id !== (int) $lockedPayment->user_id) {
                    DB::insert(
                        'INSERT INTO notifications (user_id, title, detail, level, link, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [
                            $lockedPayment->payer_id,
                            'Worker payment verified via SSLCommerz',
                            "Your payment for {$workerName} was validated. Bank Ref: {$bankTranId}.",
                            'verified',
                            '/payments',
                            $notificationTime,
                            $notificationTime,
                        ]
                    );
                }

                DB::unprepared($commitSql);
                $wasRecorded = true;
            }
        } catch (\Throwable $e) {
            try {
                $rollbackRawTransaction();
            } catch (\Throwable $rollbackError) {
                Log::error('Raw SQL payment rollback failed: ' . $rollbackError->getMessage());
            }

            throw $e;
        }

        if ($notPending) {
            return [
                'success' => false,
                'message' => 'Payment is no longer awaiting gateway confirmation.',
                'redirect_url' => "{$this->frontendUrl}/payments?payment_status=failed&reason=payment_not_pending",
            ];
        }

        $recordedPayment = Payment::find($payment->id);

        if (!$recordedPayment) {
            return [
                'success' => false,
                'message' => 'Payment could not be recorded.',
                'redirect_url' => "{$this->frontendUrl}/payments?payment_status=failed&reason=record_failed",
            ];
        }

        if (!$wasRecorded && $recordedPayment->status !== 'verified') {
            return [
                'success' => false,
                'message' => 'Payment is no longer awaiting gateway confirmation.',
                'redirect_url' => "{$this->frontendUrl}/payments?payment_status=failed&reason=payment_not_pending",
            ];
        }

        return [
            'success' => true,
            'payment' => $recordedPayment,
            'redirect_url' => $this->successRedirect($recordedPayment),
        ];
    }

    public function simulatorToken(string $tranId): string
    {
        return hash_hmac('sha256', $tranId, (string) config('app.key'));
    }

    public function hasValidSandboxToken(string $tranId, ?string $token): bool
    {
        return $this->isSandbox
            && is_string($token)
            && hash_equals($this->simulatorToken($tranId), $token);
    }

    private function successRedirect(Payment $payment): string
    {
        return "{$this->frontendUrl}/payments?payment_status=success&tran_id={$payment->transaction_id}"
            . "&amount={$payment->amount}&purpose=" . urlencode($payment->purpose);
    }

    /**
     * Process failed payment callback.
     */
    public function handleFail(Request $request): array
    {
        $tranId = $request->input('tran_id');
        if ($tranId) {
            $payment = Payment::where('transaction_id', $tranId)->first();
            if ($payment && $payment->status === 'pending') {
                $payment->update([
                    'status' => 'disputed',
                    'notes' => ($payment->notes ? $payment->notes . ' | ' : '') . 'Gateway transaction failed by user or bank.',
                ]);
            }
        }

        return [
            'success' => false,
            'redirect_url' => "{$this->frontendUrl}/payments?payment_status=failed&tran_id={$tranId}",
        ];
    }

    /**
     * Process cancelled payment callback.
     */
    public function handleCancel(Request $request): array
    {
        $tranId = $request->input('tran_id');
        if ($tranId) {
            $payment = Payment::where('transaction_id', $tranId)->first();
            if ($payment && $payment->status === 'pending') {
                $payment->update([
                    'status' => 'pending',
                    'notes' => ($payment->notes ? $payment->notes . ' | ' : '') . 'Payment cancelled by user at gateway portal.',
                ]);
            }
        }

        return [
            'success' => false,
            'redirect_url' => "{$this->frontendUrl}/payments?payment_status=cancelled&tran_id={$tranId}",
        ];
    }

    /**
     * Render an SSLCommerz Sandbox Checkout HTML simulator.
     */
    public function renderSimulatorHtml(string $tranId, string $simulatorToken): string
    {
        $payment = Payment::where('transaction_id', $tranId)->first();
        if (!$payment) {
            return "<h3>Transaction {$tranId} not found in Dunki registry.</h3>";
        }

        $user = $payment->user;
        $workerName = htmlspecialchars($user ? $user->name : 'Migrant Worker');
        $purpose = htmlspecialchars($payment->purpose);
        $amount = number_format($payment->amount, 2);
        $successEndpoint = url('/api/payments/sslcommerz/success');
        $cancelEndpoint = url('/api/payments/sslcommerz/cancel');

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSLCommerz Payment Gateway — Sandbox Checkout</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #f3f4f8; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .gateway-card { background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); width: 100%; max-width: 500px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: #003366; color: #ffffff; padding: 24px; position: relative; }
    .header-badge { display: inline-block; background: #fbbf24; color: #78350f; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px; margin-bottom: 8px; }
    .header h1 { font-size: 20px; font-weight: 700; }
    .header p { font-size: 13px; color: #cbd5e1; margin-top: 4px; }
    .summary { padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .summary-item label { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    .summary-item span { font-size: 14px; font-weight: 600; color: #0f172a; }
    .amount-box { text-align: right; }
    .amount-box .val { font-size: 22px; font-weight: 800; color: #003366; font-family: monospace; }
    .methods { padding: 24px; }
    .methods-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 14px; letter-spacing: 0.5px; }
    .method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .method-btn { background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 14px 10px; text-align: center; cursor: pointer; transition: all 0.15s ease; outline: none; }
    .method-btn:hover, .method-btn.selected { border-color: #003366; background: #f0f7ff; box-shadow: 0 2px 8px rgba(0,51,102,0.12); }
    .method-btn .icon { font-size: 22px; display: block; margin-bottom: 4px; }
    .method-btn .name { font-size: 13px; font-weight: 700; color: #1e293b; }
    .method-btn .sub { font-size: 10px; color: #64748b; }
    .actions { display: flex; gap: 10px; }
    .btn-pay { flex: 2; background: #00875a; color: #ffffff; border: none; padding: 14px; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
    .btn-pay:hover { background: #006644; }
    .btn-cancel { flex: 1; background: #ffffff; color: #64748b; border: 1px solid #cbd5e1; padding: 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; text-align: center; }
    .btn-cancel:hover { background: #f1f5f9; color: #334155; }
    .footer { text-align: center; padding: 16px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="gateway-card">
    <div class="header">
      <span class="header-badge">SSLCommerz Sandbox Verified</span>
      <h1>SSLCommerz Payment Gateway</h1>
      <p>Official Migration Registry Payment Portal</p>
    </div>

    <div class="summary">
      <div class="summary-item">
        <label>Worker / Applicant</label>
        <span>{$workerName}</span>
        <label style="margin-top:6px;">Purpose</label>
        <span>{$purpose}</span>
      </div>
      <div class="amount-box">
        <label>Total Fee</label>
        <div class="val">৳{$amount}</div>
        <span style="font-size:11px; color:#64748b; font-family:monospace;">{$tranId}</span>
      </div>
    </div>

    <form method="POST" action="{$successEndpoint}" class="methods">
      <input type="hidden" name="tran_id" value="{$tranId}">
    <input type="hidden" name="sandbox_token" value="{$simulatorToken}">
      <input type="hidden" name="val_id" id="val_id" value="VAL-SSL-{$tranId}">
      <input type="hidden" name="bank_tran_id" id="bank_tran_id" value="BNK-{$tranId}">
      <input type="hidden" name="amount" value="{$payment->amount}">
      <input type="hidden" name="card_type" id="card_type" value="bKash-Payment">

      <div class="methods-title">Choose Payment Channel</div>
      <div class="method-grid">
        <button type="button" class="method-btn selected" onclick="selectMethod('bKash-Payment', this)">
          <span class="icon">📱</span>
          <div class="name">bKash</div>
          <div class="sub">Instant MFS Transfer</div>
        </button>

        <button type="button" class="method-btn" onclick="selectMethod('Nagad-Payment', this)">
          <span class="icon">⚡</span>
          <div class="name">Nagad</div>
          <div class="sub">Postal MFS</div>
        </button>

        <button type="button" class="method-btn" onclick="selectMethod('VISA-Debit/Credit', this)">
          <span class="icon">💳</span>
          <div class="name">VISA Card</div>
          <div class="sub">Debit or Credit</div>
        </button>

        <button type="button" class="method-btn" onclick="selectMethod('Mastercard', this)">
          <span class="icon">🌐</span>
          <div class="name">Mastercard</div>
          <div class="sub">International / Local</div>
        </button>
      </div>

      <div class="actions">
        <a href="{$cancelEndpoint}?tran_id={$tranId}" class="btn-cancel">Cancel</a>
        <button type="submit" class="btn-pay" id="payBtn">
          Pay ৳{$amount} via bKash
        </button>
      </div>
    </form>

    <div class="footer">
      🔒 256-Bit SSL Encrypted &bull; Approved by Bangladesh Bank &bull; BMET Anti-Extortion Compliant
    </div>
  </div>

  <script>
    function selectMethod(method, btn) {
      document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('card_type').value = method;
      const cleanName = method.split('-')[0];
      document.getElementById('payBtn').innerText = 'Pay ৳{$amount} via ' + cleanName;
    }
  </script>
</body>
</html>
HTML;
    }
}
