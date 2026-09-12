<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\User;

class ContractService
{
    /**
     * Get all contracts for the specified user.
     */
    public function getUserContracts(User $user)
    {
        return $user->contracts()->latest()->get();
    }

    /**
     * Create a new contract for the specified user.
     */
    public function createContract(User $user, array $data): Contract
    {
        return $user->contracts()->create($data);
    }

    /**
     * Update an existing contract.
     */
    public function updateContract(Contract $contract, array $data): Contract
    {
        $contract->update($data);
        return $contract;
    }

    /**
     * Delete an existing contract.
     */
    public function deleteContract(Contract $contract): void
    {
        $contract->delete();
    }
}
