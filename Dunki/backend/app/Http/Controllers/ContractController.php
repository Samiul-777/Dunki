<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\User;
use App\Services\ContractService;
use Illuminate\Http\Request;

class ContractController extends Controller
{
    public function __construct(
        protected ContractService $contractService
    ) {}

    // READ — all contracts belonging to or issued by the logged-in user
    public function index(Request $request)
    {
        return response()->json(
            $this->contractService->getUserContracts($request->user())
        );
    }

    // READ — one contract
    public function show(Request $request, Contract $contract)
    {
        $user = $request->user();

        // Worker can only view contracts assigned to them
        if ($user->role === 'worker' && $contract->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized access to contract.'], 403);
        }

        // Agency can only view contracts they issued
        if ($user->role === 'agency' && $contract->agency_id !== $user->id && $contract->agency_name !== ($user->agency ?: $user->name)) {
            return response()->json(['message' => 'Unauthorized access to contract.'], 403);
        }

        return response()->json(
            $contract->load(['user:id,name,email,phone,tracking_id,destination', 'agency:id,name,email,agency'])
        );
    }

    // READ — candidate workers for contract issuance (Agency only)
    public function availableWorkers(Request $request)
    {
        if ($request->user()->role !== 'agency' && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(
            $this->contractService->getAvailableWorkers($request->user())
        );
    }

    // CREATE — Strictly Recruitment Agencies & Admins
    public function store(Request $request)
    {
        $user = $request->user();

        // Migrant workers are NOT allowed to issue contracts
        if ($user->role === 'worker') {
            return response()->json([
                'message' => 'Migrant workers cannot create contracts. Contracts must be officially issued by a licensed recruiting agency or verified employer.',
            ], 403);
        }

        $data = $request->validate([
            'worker_id'           => 'nullable|exists:users,id',
            'worker_tracking_id'  => 'nullable|string|max:50',
            'worker_email'        => 'nullable|email',
            'job_title'           => 'required|string|max:255',
            'destination_country' => 'required|string|max:255',
            'agency_name'         => 'nullable|string|max:255',
            'salary_amount'       => 'required|numeric|min:1',
            'salary_currency'     => 'nullable|string|max:10',
            'contract_terms'      => 'nullable|string|max:5000',
        ]);

        // Resolve target worker
        $worker = null;
        if (!empty($data['worker_id'])) {
            $worker = User::where('role', 'worker')->find($data['worker_id']);
        } elseif (!empty($data['worker_tracking_id'])) {
            $worker = User::where('role', 'worker')->where('tracking_id', trim($data['worker_tracking_id']))->first();
        } elseif (!empty($data['worker_email'])) {
            $worker = User::where('role', 'worker')->where('email', trim($data['worker_email']))->first();
        }

        if (!$worker) {
            return response()->json([
                'message' => 'Target worker not found. Please provide a valid worker selection, Tracking ID, or registered email.',
            ], 422);
        }

        $contract = $this->contractService->issueContract($user, $worker, $data);

        return response()->json($contract, 201);
    }

    // UPDATE
    public function update(Request $request, Contract $contract)
    {
        $user = $request->user();

        // Workers cannot alter contract salary or clauses
        if ($user->role === 'worker') {
            return response()->json([
                'message' => 'Workers cannot modify official contract terms. If there is a discrepancy, please file a complaint.',
            ], 403);
        }

        // Agency can only edit their own contracts
        if ($user->role === 'agency' && $contract->agency_id !== $user->id && $contract->agency_name !== ($user->agency ?: $user->name)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'job_title'           => 'sometimes|string|max:255',
            'destination_country' => 'sometimes|string|max:255',
            'agency_name'         => 'sometimes|string|max:255',
            'salary_amount'       => 'sometimes|numeric|min:1',
            'salary_currency'     => 'sometimes|string|max:10',
            'status'              => 'sometimes|in:pending,verified,rejected',
            'contract_terms'      => 'nullable|string|max:5000',
        ]);

        $contract = $this->contractService->updateContract($contract, $data);

        return response()->json($contract);
    }

    // DELETE
    public function destroy(Request $request, Contract $contract)
    {
        $user = $request->user();

        // Workers cannot delete contracts
        if ($user->role === 'worker') {
            return response()->json([
                'message' => 'Migrant workers cannot delete official registry contracts.',
            ], 403);
        }

        // Agency check
        if ($user->role === 'agency' && $contract->agency_id !== $user->id && $contract->agency_name !== ($user->agency ?: $user->name)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $this->contractService->deleteContract($contract);

        return response()->json(['message' => 'Contract deleted successfully']);
    }
}
