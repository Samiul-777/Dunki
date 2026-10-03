<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\Notification;
use App\Models\User;

class ContractService
{
    /**
     * Get all contracts for the specified user based on role.
     * Workers can only view the contracts they are under.
     * Agencies view the contracts they have issued.
     */
    public function getUserContracts(User $user)
    {
        if ($user->role === 'worker') {
            return Contract::where('user_id', $user->id)
                ->with(['agency:id,name,email,phone,agency,verification_status'])
                ->latest()
                ->get();
        }

        if ($user->role === 'agency') {
            $agencyName = $user->agency ?: $user->name;
            return Contract::where(function ($query) use ($user, $agencyName) {
                $query->where('agency_id', $user->id)
                    ->orWhere('agency_name', $agencyName);
            })
                ->with(['user:id,name,email,phone,tracking_id,verification_status,destination'])
                ->latest()
                ->get();
        }

        // Admin sees all
        return Contract::with(['user:id,name,email,phone,tracking_id', 'agency:id,name,email,phone'])
            ->latest()
            ->get();
    }

    /**
     * Issue a new contract for a worker (Recruiting Agency or Admin only).
     */
    public function issueContract(User $issuer, User $worker, array $data): Contract
    {
        $agencyName = $data['agency_name'] ?? ($issuer->agency ?: $issuer->name);

        $contract = Contract::create([
            'user_id' => $worker->id,
            'agency_id' => $issuer->role === 'agency' ? $issuer->id : null,
            'agency_name' => $agencyName,
            'job_title' => $data['job_title'],
            'destination_country' => $data['destination_country'],
            'salary_amount' => $data['salary_amount'],
            'salary_currency' => $data['salary_currency'] ?? 'SAR',
            'status' => $data['status'] ?? 'pending',
            'contract_terms' => $data['contract_terms'] ?? null,
        ]);

        // Notify the worker
        Notification::create([
            'user_id' => $worker->id,
            'title' => 'New Employment Contract Issued',
            'detail' => "Official contract for {$contract->job_title} ({$contract->destination_country}) was issued by {$contract->agency_name}.",
            'level' => 'info',
            'link' => '/contracts',
        ]);

        return $contract->load(['user:id,name,email,phone,tracking_id', 'agency:id,name,email']);
    }

    /**
     * Get candidate workers that this agency can issue contracts to.
     */
    public function getAvailableWorkers(User $agencyUser)
    {
        // First priority: workers who applied to this agency's jobs
        $appliedWorkerIds = \App\Models\JobApplication::whereHas('job', function ($q) use ($agencyUser) {
            $q->where('creator_id', $agencyUser->id)
                ->orWhere('agency', $agencyUser->agency ?: $agencyUser->name);
        })->pluck('applicant_id')->toArray();

        // Also fetch any other registered workers
        return User::where('role', 'worker')
            ->select('id', 'name', 'email', 'phone', 'tracking_id', 'destination', 'verification_status')
            ->orderByRaw('CASE WHEN id IN (' . (empty($appliedWorkerIds) ? '0' : implode(',', $appliedWorkerIds)) . ') THEN 0 ELSE 1 END')
            ->latest()
            ->take(30)
            ->get();
    }

    public function searchRelevantWorkers(User $agencyUser, string $term)
    {
        return $this->relevantWorkersQuery($agencyUser)
            ->where(function ($query) use ($term) {
                $query->where('name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%")
                    ->orWhere('tracking_id', 'like', "%{$term}%");
            })
            ->orderBy('name')
            ->limit(10)
            ->get(['id', 'name', 'email', 'tracking_id', 'destination', 'verification_status'])
            ->map(fn(User $worker) => [
                'id' => $worker->id,
                'name' => $worker->name,
                'email' => $worker->email,
                'tracking_id' => $worker->tracking_id,
                'display_name' => $worker->name,
            ])
            ->values();
    }

    public function isRelevantWorker(User $agencyUser, User $worker): bool
    {
        return $worker->role === 'worker'
            && $this->relevantWorkersQuery($agencyUser)->whereKey($worker->id)->exists();
    }

    private function relevantWorkersQuery(User $agencyUser)
    {
        $agencyName = $agencyUser->agency ?: $agencyUser->name;

        return User::query()
            ->where('role', 'worker')
            ->where(function ($query) use ($agencyUser, $agencyName) {
                $query->whereHas('applications', function ($applications) use ($agencyUser) {
                    $applications->whereHas('job', function ($jobs) use ($agencyUser) {
                        $jobs->where('creator_id', $agencyUser->id);
                    });
                })->orWhereHas('contracts', function ($contracts) use ($agencyUser, $agencyName) {
                    $contracts->where('agency_id', $agencyUser->id)
                        ->orWhere(function ($legacyContracts) use ($agencyUser, $agencyName) {
                            $legacyContracts->whereNull('agency_id')->where('agency_name', $agencyName);
                        });
                });
            });
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
