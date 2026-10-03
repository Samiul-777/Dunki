<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\Document;
use App\Models\JobApplication;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\Complaint;
use App\Models\JobListing;
use App\Services\DestinationService;
use App\Services\DocumentService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request, DocumentService $documentService, DestinationService $destinationService)
    {
        $user = $request->user();

        if ($user->role === 'agency') {
            return $this->agencyDashboard($user);
        }

        return $this->workerDashboard($user, $documentService, $destinationService);
    }

    protected function workerDashboard($user, DocumentService $documentService, DestinationService $destinationService)
    {
        // 1. Applications & Active Job
        $applications = JobApplication::with('job')
            ->where('applicant_id', $user->id)
            ->latest()
            ->get();
        $latestApp = $applications->first();

        // 2. Contracts
        $contracts = Contract::where('user_id', $user->id)->latest()->get();
        $latestContract = $contracts->first();
        $hasVerifiedContract = $contracts->where('status', 'verified')->isNotEmpty();

        // 3. Resolve Destination & Agency dynamically if not explicitly on user profile
        $destinationContext = $destinationService->resolve(
            $user->destination,
            $latestContract?->destination_country,
            $latestApp?->job?->country
        );
        $destination = $destinationContext['effective_destination'];

        $agency = $user->agency;
        if (!$agency && $latestContract) {
            $agency = $latestContract->agency_name;
        } elseif (!$agency && $latestApp && $latestApp->job) {
            $agency = $latestApp->job->agency;
        }

        // 4. Documents & Dynamic Checklist
        $userDocs = $documentService->getUserDocuments($user);

        $standardChecklist = [
            ['key' => 'nid', 'name' => 'National ID (NID)', 'type' => 'nid'],
            ['key' => 'passport', 'name' => 'Passport copy', 'type' => 'passport'],
            ['key' => 'medical', 'name' => 'Medical fitness report', 'type' => 'medical'],
            ['key' => 'training', 'name' => 'Training certificate', 'type' => 'training'],
            ['key' => 'police', 'name' => 'Police clearance', 'type' => 'police'],
        ];

        $checklist = [];
        foreach ($standardChecklist as $item) {
            $match = $userDocs->first(function ($doc) use ($item) {
                $nameMatch = stripos($doc->name, $item['name']) !== false ||
                    stripos($doc->name, $item['key']) !== false;
                $typeMatch = !empty($doc->type) && stripos($doc->type, $item['type']) !== false;
                return $nameMatch || $typeMatch;
            });

            // Special case for identity verification
            if (($item['key'] === 'nid' || $item['key'] === 'passport') && $user->verification_status === 'verified') {
                $status = 'complete';
                $fileUrl = $match?->file_url ?? ($user->verification_document_path ? url('storage/' . $user->verification_document_path) : null);
            } else {
                $status = ($match && ($match->status === 'complete' || $match->status === 'verified')) ? 'complete' : 'missing';
                $fileUrl = $match?->file_url ?? null;
            }

            $checklist[] = [
                'name' => $item['name'],
                'type' => $item['type'],
                'status' => $status,
                'file_url' => $fileUrl,
                'doc_id' => $match?->id,
            ];
        }

        // Add any custom extra documents uploaded by user
        foreach ($userDocs as $customDoc) {
            $alreadyIncluded = collect($checklist)->contains(function ($c) use ($customDoc) {
                return stripos($customDoc->name, $c['name']) !== false;
            });
            if (!$alreadyIncluded && $customDoc->type !== 'verification') {
                $checklist[] = [
                    'name' => $customDoc->name,
                    'type' => $customDoc->type ?? 'other',
                    'status' => $customDoc->status === 'complete' ? 'complete' : 'missing',
                    'file_url' => $customDoc->file_url,
                    'doc_id' => $customDoc->id,
                ];
            }
        }

        $completedDocsCount = collect($checklist)->where('status', 'complete')->count();
        $totalDocsCount = count($checklist);
        $missingDocsCount = $totalDocsCount - $completedDocsCount;

        // 5. Dynamic Journey Stages (Live state computation!)
        $hasApplications = $applications->isNotEmpty();
        $hasAcceptedApp = $applications->where('status', 'accepted')->isNotEmpty();
        $hasMedicalDoc = collect($checklist)->firstWhere('type', 'medical')['status'] === 'complete';
        $hasVisaDoc = $userDocs->contains(fn($d) => stripos($d->name, 'visa') !== false && $d->status === 'complete');
        $hasTravelDoc = $userDocs->contains(fn($d) => (stripos($d->name, 'travel') !== false || stripos($d->name, 'ticket') !== false || stripos($d->name, 'bmet') !== false) && $d->status === 'complete');

        $journeyStages = [
            [
                'key' => 'applied',
                'label' => 'Applied',
                'status' => $hasApplications ? 'done' : 'current',
                'detail' => $hasApplications ? ($latestApp ? "Applied for {$latestApp->job->title}" : 'Application submitted') : 'Find and apply for verified jobs',
            ],
            [
                'key' => 'reviewed',
                'label' => 'Agency Review',
                'status' => ($hasAcceptedApp || $latestContract) ? 'done' : ($hasApplications ? 'current' : 'pending'),
                'detail' => $hasAcceptedApp ? 'Application accepted by agency' : ($hasApplications ? 'Under agency review' : 'Awaiting application'),
            ],
            [
                'key' => 'contract',
                'label' => 'Contract Verified',
                'status' => $hasVerifiedContract ? 'done' : ($latestContract ? 'current' : ($hasAcceptedApp ? 'current' : 'pending')),
                'detail' => $hasVerifiedContract ? 'Contract verified on registry' : ($latestContract ? 'Contract pending verification' : 'Awaiting contract issue'),
            ],
            [
                'key' => 'medical',
                'label' => 'Medical',
                'status' => $hasMedicalDoc ? 'done' : ($hasVerifiedContract ? 'current' : 'pending'),
                'detail' => $hasMedicalDoc ? 'Medical fitness clearance passed' : ($hasVerifiedContract ? 'Medical examination pending' : 'Requires verified contract first'),
            ],
            [
                'key' => 'visa',
                'label' => 'Visa',
                'status' => $hasVisaDoc ? 'done' : ($hasMedicalDoc ? 'current' : 'pending'),
                'detail' => $hasVisaDoc ? 'Employment visa issued and stamped' : ($hasMedicalDoc ? 'Visa processing with embassy' : 'Pending medical fitness'),
            ],
            [
                'key' => 'travel',
                'label' => 'Travel',
                'status' => $hasTravelDoc ? 'done' : ($hasVisaDoc ? 'current' : 'pending'),
                'detail' => $hasTravelDoc ? 'BMET smart card & flight ready' : ($hasVisaDoc ? 'BMET immigration clearance pending' : 'Pending visa issuance'),
            ],
        ];

        // 6. Real Payments & Ledger
        $payments = Payment::where('user_id', $user->id)->latest('payment_date')->get();
        $totalPaid = (float) $payments->sum('amount');
        $costCap = $destinationContext['cost_cap'];
        $isOvercharged = $totalPaid > $costCap;

        $recentPayments = $payments->take(5)->map(function ($p) {
            return [
                'id' => $p->id,
                'purpose' => $p->purpose,
                'amount' => $p->amount,
                'method' => $p->payment_method,
                'date' => $p->payment_date->format('Y-m-d'),
                'status' => $p->status,
                'receipt_url' => $p->receipt_url,
                'transaction_id' => $p->transaction_id,
            ];
        });

        // 7. Complaints
        $complaints = Complaint::where('user_id', $user->id)->latest()->get();
        $activeComplaintsCount = $complaints->whereNotIn('status', ['resolved', 'dismissed'])->count();

        // 8. Real & Dynamic Notifications
        $storedNotifications = Notification::where('user_id', $user->id)
            ->latest()
            ->take(5)
            ->get()
            ->map(function ($n) {
                return [
                    'id' => $n->id,
                    'title' => $n->title,
                    'detail' => $n->detail,
                    'level' => $n->level,
                    'time' => $n->created_at->diffForHumans(),
                    'link' => $n->link,
                ];
            });

        // Generate contextual alerts if notifications are few
        $notifications = collect($storedNotifications);

        if ($user->verification_status !== 'verified') {
            $notifications->prepend([
                'id' => 'system-verify',
                'title' => 'Identity verification required',
                'detail' => 'Upload your NID or Passport to unlock official verified worker status.',
                'level' => 'alert',
                'time' => 'Action required',
                'link' => '/verify',
            ]);
        }

        if ($isOvercharged) {
            $notifications->prepend([
                'id' => 'system-overcharge',
                'title' => 'Potential Fee Overcharge Detected',
                'detail' => 'Total payments (৳' . number_format($totalPaid) . ') exceed the BMET legal cap of ৳' . number_format($costCap) . ' for ' . ($destination ?? 'your destination') . '. You may lodge a complaint.',
                'level' => 'alert',
                'time' => 'Registry alert',
                'link' => '/complaints',
            ]);
        }

        if ($missingDocsCount > 0) {
            $notifications->push([
                'id' => 'system-docs',
                'title' => "{$missingDocsCount} mandatory documents missing",
                'detail' => 'Upload missing records to avoid deployment delays.',
                'level' => 'warning',
                'time' => 'Reminder',
                'link' => '/documents',
            ]);
        }

        return response()->json([
            'worker' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'tracking_id' => $user->tracking_id,
                'role' => $user->role,
                'verification_status' => $user->verification_status,
                'destination' => $destination ?: 'Not selected yet',
                'agency' => $agency ?: 'Not assigned yet',
            ],
            'journeyStages' => $journeyStages,
            'documentChecklist' => $checklist,
            'documentStats' => [
                'total' => $totalDocsCount,
                'completed' => $completedDocsCount,
                'missing' => $missingDocsCount,
                'percentage' => $totalDocsCount > 0 ? round(($completedDocsCount / $totalDocsCount) * 100) : 0,
            ],
            'recentPayments' => $recentPayments,
            'paymentSummary' => [
                'total_paid' => $totalPaid,
                'cost_cap' => $costCap,
                'is_overcharged' => $isOvercharged,
                'overcharge_amount' => $isOvercharged ? ($totalPaid - $costCap) : 0,
            ],
            'notifications' => $notifications->take(6)->values(),
            'complaintsSummary' => [
                'total' => $complaints->count(),
                'active' => $activeComplaintsCount,
            ],
            'stats' => [
                'applications_count' => $applications->count(),
                'contracts_count' => $contracts->count(),
                'payments_count' => $payments->count(),
                'complaints_count' => $complaints->count(),
            ],
        ]);
    }

    protected function agencyDashboard($user)
    {
        $jobs = JobListing::where('creator_id', $user->id)->latest()->get();
        $jobIds = $jobs->pluck('id');

        $applications = JobApplication::with(['job', 'applicant'])
            ->whereIn('job_listing_id', $jobIds)
            ->latest()
            ->get();

        $pendingApps = $applications->where('status', 'applied')->count();
        $acceptedApps = $applications->where('status', 'accepted')->count();

        $complaintsAgainst = Complaint::where('against_agency', 'LIKE', '%' . $user->name . '%')
            ->latest()
            ->get();

        $notifications = Notification::where('user_id', $user->id)
            ->latest()
            ->take(5)
            ->get()
            ->map(function ($n) {
                return [
                    'id' => $n->id,
                    'title' => $n->title,
                    'detail' => $n->detail,
                    'level' => $n->level,
                    'time' => $n->created_at->diffForHumans(),
                ];
            });

        return response()->json([
            'worker' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'tracking_id' => $user->tracking_id,
                'role' => $user->role,
                'verification_status' => $user->verification_status,
                'destination' => 'Recruitment Agency HQ',
                'agency' => $user->name,
            ],
            'agencyStats' => [
                'total_jobs' => $jobs->count(),
                'active_jobs' => $jobs->count(),
                'total_applications' => $applications->count(),
                'pending_reviews' => $pendingApps,
                'accepted_candidates' => $acceptedApps,
                'complaints_received' => $complaintsAgainst->count(),
            ],
            'recentApplications' => $applications->take(5)->values(),
            'complaints' => $complaintsAgainst->take(5)->values(),
            'notifications' => $notifications,
        ]);
    }
}
