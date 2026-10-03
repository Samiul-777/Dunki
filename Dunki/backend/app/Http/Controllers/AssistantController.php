<?php

namespace App\Http\Controllers;

use App\Services\RagAssistantService;
use Illuminate\Http\Request;

class AssistantController extends Controller
{
    public function __construct(
        protected RagAssistantService $ragService
    ) {}

    /**
     * Chat with the Dunki RAG Assistant.
     */
    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:1000',
            'history' => 'nullable|array',
        ]);

        $message = $request->input('message');
        $history = $request->input('history', []);
        $user = $request->user();

        $result = $this->ragService->answer($message, $user, $history);

        return response()->json($result);
    }

    /**
     * Provide quick prompt suggestions based on platform features.
     */
    public function suggestions(Request $request)
    {
        return response()->json([
            'suggestions' => [
                'Can I make payments without logging in?',
                'Why cannot migrant workers add contracts?',
                'What is the legal BMET fee for Saudi Arabia?',
                'How does the fee overcharge detection work?',
                'What 5 documents are required in the Document Vault?',
                'How to file a complaint against an agency?',
                'What are the emergency helpline numbers?',
            ],
        ]);
    }
}
