<?php

namespace App\Http\Controllers;

use App\Services\AIJobService;
use Illuminate\Http\Request;

class AIJobController extends Controller
{
    public function __construct(
        protected AIJobService $aiJobService
    ) {}

    /**
     * Generate structured job drafts from a natural language prompt.
     */
    public function generate(Request $request)
    {
        if ($request->user()->role !== 'agency') {
            return response()->json(['message' => 'Only agencies can access the AI job assistant.'], 403);
        }

        $request->validate([
            'prompt' => 'required|string|min:3',
        ]);

        $prompt = $request->input('prompt');
        $agencyName = $request->user()->agency ?: $request->user()->name;

        $result = $this->aiJobService->generate($prompt, $agencyName);

        return response()->json($result);
    }

    /**
     * Autonomously generate and post job listing(s) directly to the database for the current agency.
     */
    public function autoPost(Request $request)
    {
        if ($request->user()->role !== 'agency') {
            return response()->json(['message' => 'Only agencies can post job listings.'], 403);
        }

        $request->validate([
            'prompt' => 'required|string|min:3',
        ]);

        $prompt = $request->input('prompt');
        $result = $this->aiJobService->autoPost($request->user(), $prompt);

        return response()->json($result, 201);
    }
}
