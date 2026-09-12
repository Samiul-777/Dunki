<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Services\ContractService;
use Illuminate\Http\Request;

class ContractController extends Controller
{
    public function __construct(
        protected ContractService $contractService
    ) {}

    // READ — all contracts belonging to the logged-in user
    public function index(Request $request)
    {
        return response()->json(
            $this->contractService->getUserContracts($request->user())
        );
    }

    // READ — one contract
    public function show(Request $request, Contract $contract)
    {
        return response()->json($contract);
    }

    // CREATE
    public function store(Request $request)
    {
        $data = $request->validate([
            'job_title' => 'required|string|max:255',
            'destination_country' => 'required|string|max:255',
            'agency_name' => 'required|string|max:255',
            'salary_amount' => 'required|numeric',
            'salary_currency' => 'nullable|string|max:10',
        ]);

        $contract = $this->contractService->createContract($request->user(), $data);

        return response()->json($contract, 201);
    }

    // UPDATE
    public function update(Request $request, Contract $contract)
    {
        $data = $request->validate([
            'job_title' => 'sometimes|string|max:255',
            'destination_country' => 'sometimes|string|max:255',
            'agency_name' => 'sometimes|string|max:255',
            'salary_amount' => 'sometimes|numeric',
            'salary_currency' => 'sometimes|string|max:10',
            'status' => 'sometimes|in:pending,verified,rejected',
        ]);

        $contract = $this->contractService->updateContract($contract, $data);

        return response()->json($contract);
    }

    // DELETE
    public function destroy(Contract $contract)
    {
        $this->contractService->deleteContract($contract);

        return response()->json(['message' => 'Contract deleted']);
    }
}
