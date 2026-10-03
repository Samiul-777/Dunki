<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ComplaintController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Complaint::with('user:id,name,phone,tracking_id');

        if ($user->role === 'worker' || $user->role === 'nominee') {
            $query->where('user_id', $user->id);
        } elseif ($user->role === 'agency') {
            // Agencies see complaints lodged against their agency name
            $query->where(function ($q) use ($user) {
                $q->where('against_agency', 'LIKE', '%' . $user->name . '%')
                  ->orWhere('against_agency', 'LIKE', '%' . ($user->agency ?? $user->name) . '%');
            });
        }

        $complaints = $query->latest()->get();

        $stats = [
            'total'             => $complaints->count(),
            'submitted'         => $complaints->where('status', 'submitted')->count(),
            'under_review'      => $complaints->where('status', 'under_review')->count(),
            'investigating'     => $complaints->where('status', 'investigating')->count(),
            'escalated_to_bmet' => $complaints->where('status', 'escalated_to_bmet')->count(),
            'resolved'          => $complaints->where('status', 'resolved')->count(),
        ];

        return response()->json([
            'complaints' => $complaints,
            'stats'      => $stats,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'against_agency' => 'required|string|max:255',
            'category'       => 'required|string|max:100',
            'subject'        => 'required|string|max:255',
            'description'    => 'required|string|max:5000',
            'priority'       => 'nullable|string|in:low,medium,high,urgent',
            'evidence'       => 'nullable|file|mimes:pdf,jpg,jpeg,png,mp3,wav,m4a|max:10240', // 10MB
        ]);

        $evidencePath = null;
        if ($request->hasFile('evidence')) {
            $evidencePath = $request->file('evidence')->store('evidence', 'public');
        }

        $complaint = Complaint::create([
            'user_id'        => $request->user()->id,
            'against_agency' => $data['against_agency'],
            'category'       => $data['category'],
            'subject'        => $data['subject'],
            'description'    => $data['description'],
            'evidence_path'  => $evidencePath,
            'priority'       => $data['priority'] ?? 'medium',
            'status'         => 'submitted',
        ]);

        // Auto-create notification for the worker
        Notification::create([
            'user_id' => $request->user()->id,
            'title'   => 'Complaint Lodged (' . $complaint->tracking_id . ')',
            'detail'  => "Your complaint regarding '{$complaint->subject}' against {$complaint->against_agency} has been officially recorded.",
            'level'   => 'info',
            'link'    => '/complaints',
        ]);

        return response()->json($complaint, 201);
    }

    public function show(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if ($user->role === 'worker' && $complaint->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($complaint->load('user:id,name,phone,tracking_id'));
    }

    public function update(Request $request, Complaint $complaint)
    {
        $user = $request->user();

        // Worker can update description or notes if still submitted
        if ($user->role === 'worker') {
            if ($complaint->user_id !== $user->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $data = $request->validate([
                'subject'     => 'sometimes|required|string|max:255',
                'description' => 'sometimes|required|string|max:5000',
                'priority'    => 'nullable|string|in:low,medium,high,urgent',
            ]);

            $complaint->update($data);
            return response()->json($complaint);
        }

        // Agency or Admin can update status and resolution notes
        $data = $request->validate([
            'status'           => 'required|string|in:submitted,under_review,investigating,escalated_to_bmet,resolved,dismissed',
            'resolution_notes' => 'nullable|string|max:2000',
        ]);

        if ($data['status'] === 'resolved' && empty($complaint->resolved_at)) {
            $data['resolved_at'] = now();
        }

        $complaint->update($data);

        // Notify complainant
        Notification::create([
            'user_id' => $complaint->user_id,
            'title'   => 'Complaint Updated (' . $complaint->tracking_id . ')',
            'detail'  => "Status changed to " . str_replace('_', ' ', strtoupper($data['status'])) . ($data['resolution_notes'] ? ": " . $data['resolution_notes'] : ""),
            'level'   => $data['status'] === 'resolved' ? 'verified' : ($data['status'] === 'escalated_to_bmet' ? 'alert' : 'info'),
            'link'    => '/complaints',
        ]);

        return response()->json($complaint);
    }

    public function escalate(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if ($user->role === 'worker' && $complaint->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $complaint->update([
            'status'   => 'escalated_to_bmet',
            'priority' => 'urgent',
            'resolution_notes' => ($complaint->resolution_notes ? $complaint->resolution_notes . "\n" : "") .
                "[" . now()->format('Y-m-d H:i') . "] Escalated directly to BMET Grievance Redressal Cell and Ministry of Expatriates' Welfare.",
        ]);

        Notification::create([
            'user_id' => $complaint->user_id,
            'title'   => 'Escalated to BMET (' . $complaint->tracking_id . ')',
            'detail'  => "Your complaint has been expedited to the Ministry of Expatriates' Welfare and BMET enforcement.",
            'level'   => 'alert',
            'link'    => '/complaints',
        ]);

        return response()->json([
            'message'   => 'Complaint successfully escalated to BMET and Ministry.',
            'complaint' => $complaint,
        ]);
    }

    public function destroy(Request $request, Complaint $complaint)
    {
        if ($complaint->user_id !== $request->user()->id && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($complaint->evidence_path) {
            Storage::disk('public')->delete($complaint->evidence_path);
        }

        $complaint->delete();

        return response()->json(['message' => 'Complaint withdrawn successfully']);
    }
}
