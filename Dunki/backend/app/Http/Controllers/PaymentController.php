<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\User;
use App\Services\ContractService;
use App\Services\DestinationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PaymentController extends Controller
{
    public function __construct(
        protected DestinationService $destinationService,
        protected ContractService $contractService
    ) {
    }

    public function index(Request $request)
    {
        $user = $request->user();

        $query = Payment::query();

        if ($user->role === 'worker' || $user->role === 'nominee') {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'agency') {
            $query->where(function ($q) use ($user) {
                $q->where('agency_id', $user->id)
                    ->orWhere('user_id', $user->id);
            });
        }

        $payments = $query
            ->with(['user:id,name', 'agency:id,name,agency', 'payer:id,name'])
            ->latest('payment_date')
            ->get();
        $payments->each(function (Payment $payment) use ($user) {
            $agencyPaid = $payment->payer_id && $payment->payer_id === $payment->agency_id;
            $agencyName = $payment->agency?->agency ?: $payment->agency?->name ?: $payment->agency_name;
            $payment->setAttribute('direction', $agencyPaid ? 'agency_to_worker' : 'worker_to_agency');
            $payment->setAttribute('counterparty_name', $user->role === 'agency'
                ? $payment->user?->name
                : $agencyName);
        });

        $destinationContext = $this->destinationService->forUser($user);
        $destination = $destinationContext['effective_destination'] ?? 'Default';
        $costCap = $destinationContext['cost_cap'];
        $paidByUser = Payment::query()
            ->where(function ($query) use ($user) {
                $query->where('payer_id', $user->id)
                    ->orWhere(function ($legacyQuery) use ($user) {
                        $legacyQuery->whereNull('payer_id')->where('user_id', $user->id);
                    });
            })
            ->get();
        $totalPaid = (float) $paidByUser->sum('amount');
        $isOvercharged = $totalPaid > $costCap;

        return response()->json([
            'payments' => $payments,
            'summary' => [
                'total_paid' => $totalPaid,
                'count' => $paidByUser->count(),
                'cost_cap' => $costCap,
                'destination' => $destination,
                'is_overcharged' => $isOvercharged,
                'overcharge_amount' => $isOvercharged ? ($totalPaid - $costCap) : 0,
            ],
        ]);
    }

    public function searchAgencies(Request $request)
    {
        $data = $request->validate(['search' => 'required|string|min:2|max:100']);
        $term = trim($data['search']);

        return User::query()
            ->where('role', 'agency')
            ->where(function ($query) use ($term) {
                $query->where('name', 'like', "%{$term}%")
                    ->orWhere('agency', 'like', "%{$term}%");
            })
            ->orderBy('name')
            ->limit(10)
            ->get(['id', 'name', 'agency'])
            ->map(fn(User $agency) => [
                'id' => $agency->id,
                'name' => $agency->name,
                'display_name' => $agency->agency ?: $agency->name,
            ])
            ->values();
    }

    public function searchWorkers(Request $request)
    {
        if ($request->user()->role !== 'agency') {
            return response()->json(['message' => 'Only agencies can search their relevant workers.'], 403);
        }

        $data = $request->validate(['search' => 'required|string|min:2|max:100']);

        return response()->json(
            $this->contractService->searchRelevantWorkers($request->user(), trim($data['search']))
        );
    }

    public function transactions(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role, ['worker', 'agency'], true)) {
            return response()->json(['totals_by_currency' => [], 'transactions' => []]);
        }

        $payments = Payment::query()
            ->with(['user:id,name', 'agency:id,name,agency', 'payer:id,name'])
            ->whereNotNull('agency_id')
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->orWhere('agency_id', $user->id);
            })
            ->latest('created_at')
            ->get();

        $totalsByCurrency = $payments
            ->groupBy(fn(Payment $payment) => strtoupper($payment->currency ?: 'BDT'))
            ->map(function ($currencyPayments, $currency) use ($user) {
                $sent = $currencyPayments->filter(
                    fn(Payment $payment) =>
                        (int) ($payment->payer_id ?: $payment->user_id) === (int) $user->id
                );
                $received = $currencyPayments->filter(function (Payment $payment) use ($user) {
                    $payerId = (int) ($payment->payer_id ?: $payment->user_id);
                    $recipientId = $payerId === (int) $payment->agency_id
                        ? (int) $payment->user_id
                        : (int) $payment->agency_id;

                    return $recipientId === (int) $user->id;
                });

                return [
                    'currency' => $currency,
                    'transaction_count' => $currencyPayments->count(),
                    'sent_total' => (float) $sent->sum('amount'),
                    'received_total' => (float) $received->sum('amount'),
                ];
            })
            ->values();

        return response()->json([
            'totals_by_currency' => $totalsByCurrency,
            'transactions' => $payments->map(fn(Payment $payment) => $this->presentTransaction($payment))->values(),
        ]);
    }

    private function presentTransaction(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'worker_name' => $payment->user?->name,
            'agency_name' => $payment->agency?->agency ?: $payment->agency?->name,
            'direction' => $payment->payer_id && (int) $payment->payer_id === (int) $payment->agency_id
                ? 'Agency to worker'
                : 'Worker to agency',
            'payer_name' => $payment->payer?->name ?: $payment->user?->name,
            'recipient_name' => $payment->payer_id && (int) $payment->payer_id === (int) $payment->agency_id
                ? $payment->user?->name
                : ($payment->agency?->agency ?: $payment->agency?->name),
            'purpose' => $payment->purpose,
            'amount' => $payment->amount,
            'currency' => $payment->currency,
            'payment_method' => $payment->payment_method,
            'transaction_id' => $payment->transaction_id,
            'bank_tran_id' => $payment->bank_tran_id,
            'payment_date' => $payment->payment_date,
            'status' => $payment->status,
            'notes' => $payment->notes,
            'created_at' => $payment->created_at,
            'updated_at' => $payment->updated_at,
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'purpose' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'payment_method' => 'required|string|max:100',
            'transaction_id' => 'nullable|string|max:255',
            'agency_name' => 'nullable|string|max:255',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'receipt' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $receiptPath = null;
        if ($request->hasFile('receipt')) {
            $receiptPath = $request->file('receipt')->store('receipts', 'public');
        }

        $payment = Payment::create([
            'user_id' => $request->user()->id,
            'agency_name' => $data['agency_name'] ?? $request->user()->agency,
            'purpose' => $data['purpose'],
            'amount' => $data['amount'],
            'currency' => $data['currency'] ?? 'BDT',
            'payment_method' => $data['payment_method'],
            'transaction_id' => $data['transaction_id'] ?? null,
            'receipt_path' => $receiptPath,
            'status' => 'completed',
            'payment_date' => $data['payment_date'],
            'notes' => $data['notes'] ?? null,
        ]);

        return response()->json($payment, 201);
    }

    public function show(Request $request, Payment $payment)
    {
        if ($request->user()->role === 'worker' && $payment->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($payment);
    }

    public function update(Request $request, Payment $payment)
    {
        if (str_starts_with((string) $payment->payment_method, 'SSLCommerz') || $payment->status === 'verified') {
            return response()->json(['message' => 'Gateway payments and verified transactions cannot be edited.'], 403);
        }

        if ($request->user()->role === 'worker' && $payment->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'purpose' => 'sometimes|required|string|max:255',
            'amount' => 'sometimes|required|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'payment_method' => 'sometimes|required|string|max:100',
            'transaction_id' => 'nullable|string|max:255',
            'agency_name' => 'nullable|string|max:255',
            'payment_date' => 'sometimes|required|date',
            'status' => 'nullable|string|in:completed,pending,verified,disputed',
            'notes' => 'nullable|string|max:1000',
            'receipt' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        if ($request->hasFile('receipt')) {
            if ($payment->receipt_path) {
                Storage::disk('public')->delete($payment->receipt_path);
            }
            $data['receipt_path'] = $request->file('receipt')->store('receipts', 'public');
        }

        $payment->update($data);

        return response()->json($payment);
    }

    public function destroy(Request $request, Payment $payment)
    {
        if (str_starts_with((string) $payment->payment_method, 'SSLCommerz') || $payment->status === 'verified') {
            return response()->json(['message' => 'Gateway payments and verified transactions cannot be deleted.'], 403);
        }

        if ($payment->user_id !== $request->user()->id && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($payment->receipt_path) {
            Storage::disk('public')->delete($payment->receipt_path);
        }

        $payment->delete();

        return response()->json(['message' => 'Payment record deleted successfully']);
    }

    public function summary(Request $request)
    {
        $user = $request->user();
        $payments = Payment::where('user_id', $user->id)->get();

        $destinationContext = $this->destinationService->forUser($user);
        $destination = $destinationContext['effective_destination'] ?? 'Default';
        $costCap = $destinationContext['cost_cap'];
        $totalPaid = (float) $payments->sum('amount');
        $isOvercharged = $totalPaid > $costCap;

        $breakdown = $payments->groupBy('purpose')->map(function ($items) {
            return [
                'count' => $items->count(),
                'total' => (float) $items->sum('amount'),
            ];
        });

        return response()->json([
            'total_paid' => $totalPaid,
            'cost_cap' => $costCap,
            'destination' => $destination,
            'is_overcharged' => $isOvercharged,
            'overcharge_amount' => $isOvercharged ? ($totalPaid - $costCap) : 0,
            'breakdown' => $breakdown,
        ]);
    }
}
