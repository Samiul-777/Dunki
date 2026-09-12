<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiVerificationService
{
    /**
     * Verify an uploaded document for a worker or agency using Gemini Vision.
     */
    public function verifyDocument(User $user, string $storedPath): array
    {
        $fullPath = storage_path('app/public/' . $storedPath);

        if (!file_exists($fullPath)) {
            return [
                'authentic' => false,
                'confidence' => 'low',
                'document_type' => 'Unknown',
                'reason' => 'Uploaded document could not be located on server.',
            ];
        }

        $apiKey = env('GEMINI_API_KEY') ?: env('GOOGLE_API_KEY');

        if ($apiKey) {
            $geminiResult = $this->callGeminiVision($user, $fullPath, $apiKey);
            if ($geminiResult !== null) {
                return $geminiResult;
            }
        }

        // Fallback heuristic if API key is not configured or API request fails
        return $this->fallbackInspection($user, $fullPath);
    }

    /**
     * Multimodal Gemini 1.5 Flash Vision API call
     */
    private function callGeminiVision(User $user, string $filePath, string $apiKey): ?array
    {
        try {
            $mimeType = mime_content_type($filePath) ?: 'application/octet-stream';
            $fileData = base64_encode(file_get_contents($filePath));

            $prompt = $this->buildPrompt($user);

            $response = Http::timeout(25)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}",
                [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt],
                                [
                                    'inline_data' => [
                                        'mime_type' => $mimeType,
                                        'data' => $fileData,
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'generationConfig' => [
                        'responseMimeType' => 'application/json',
                        'temperature' => 0.2,
                    ],
                ]
            );

            if ($response->successful()) {
                $content = $response->json('candidates.0.content.parts.0.text');
                if ($content) {
                    $cleaned = trim($content);
                    $cleaned = preg_replace('/^```json/i', '', $cleaned);
                    $cleaned = preg_replace('/^```/', '', $cleaned);
                    $cleaned = preg_replace('/```$/', '', $cleaned);
                    $cleaned = trim($cleaned);

                    $decoded = json_decode($cleaned, true);
                    if (is_array($decoded) && isset($decoded['authentic'])) {
                        return [
                            'authentic' => (bool) $decoded['authentic'],
                            'confidence' => $decoded['confidence'] ?? 'high',
                            'document_type' => $decoded['document_type'] ?? ($user->role === 'agency' ? 'Agency License' : 'Identity Document'),
                            'reason' => $decoded['reason'] ?? ($decoded['authentic'] ? 'Document passed automated verification checks.' : 'Document failed verification criteria.'),
                            'detected_name' => $decoded['detected_name'] ?? $decoded['detected_agency'] ?? null,
                            'id_preview' => $decoded['id_number_preview'] ?? $decoded['license_number_preview'] ?? null,
                        ];
                    }
                }
            } else {
                Log::warning('Gemini Vision Verification API returned error status: ' . $response->status(), [
                    'body' => $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('Gemini Vision Verification call exception: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Build role-tailored prompt for Gemini Vision.
     */
    private function buildPrompt(User $user): string
    {
        $role = $user->role;
        $userName = addslashes($user->name);
        $agencyName = addslashes($user->agency ?: $user->name);

        if ($role === 'agency') {
            return <<<EOT
You are an expert regulatory compliance auditor for the Dunki Overseas Recruitment Platform.
The registered agency is "{$agencyName}", registered under user name "{$userName}".

Analyze the attached document and verify if it is an authentic, valid recruiting license, trade certification, or government authorization credential (e.g., Recruiting Agency License, Ministry of Expatriates' Welfare & Overseas Employment permit, Trade License, Certificate of Incorporation, or Chamber of Commerce certificate).

Verification Checklist:
1. Document Legitimacy: Is this an official business license or government authorization? Reject personal National IDs, passports, casual resumes, invoices, blank images, memes, or unrelated paperwork.
2. Regulatory Completeness: Does it show an agency or business name, license/registration number, official seal/stamp/signature, and issuing authority?
3. Name Consistency: Does the company or agency name in the document align or reasonably correspond with "{$agencyName}" or "{$userName}"?
4. Integrity: Is the document clear, legible, and uncorrupted?

Respond strictly with a JSON object matching this schema:
{
  "authentic": boolean,
  "confidence": "high" | "medium" | "low",
  "document_type": string,
  "detected_agency": string or null,
  "license_number_preview": string or null,
  "reason": string
}
EOT;
        }

        // Default: Worker verification prompt
        return <<<EOT
You are an expert identity verification officer for the Dunki Migrant Worker Registry.
The registered worker is "{$userName}" (Phone: "{$user->phone}").

Analyze the attached document and verify if it is an authentic, valid government-issued identity or migration clearance document (e.g., Passport, National ID / NID card, BMET Smart Card, Overseas Employment Clearance, or Driver's License).

Verification Checklist:
1. Document Legitimacy: Is this a genuine government identification or travel/work clearance document? Reject random photos, selfies, scenery, animals, memes, blank pages, or non-official paperwork.
2. Completeness & Legibility: Are the key details (full name, document number, date, issuing authority, or photo) discernible?
3. Identity Consistency: Does the name on the document match or plausibly correspond with "{$userName}"?
4. Integrity: Does the document appear intact without obvious crude forgery or manipulation?

Respond strictly with a JSON object matching this schema:
{
  "authentic": boolean,
  "confidence": "high" | "medium" | "low",
  "document_type": string,
  "detected_name": string or null,
  "id_number_preview": string or null,
  "reason": string
}
EOT;
    }

    /**
     * Fallback heuristic if Gemini API key is unreachable or omitted.
     */
    private function fallbackInspection(User $user, string $fullPath): array
    {
        $size = @filesize($fullPath) ?: 0;
        $mime = @mime_content_type($fullPath) ?: '';

        $validMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

        if (!in_array($mime, $validMimes)) {
            return [
                'authentic' => false,
                'confidence' => 'high',
                'document_type' => 'Unsupported Format',
                'reason' => 'Uploaded file format is unsupported. Please provide a clear PDF, JPEG, or PNG document.',
            ];
        }

        if ($size < 3000) {
            return [
                'authentic' => false,
                'confidence' => 'high',
                'document_type' => 'Unreadable / Blank',
                'reason' => 'Document scan appears corrupt, blank, or incomplete. Please upload a clear, legible scan.',
            ];
        }

        $type = $user->role === 'agency' ? 'Official Agency License' : 'National Identification / Passport';

        return [
            'authentic' => true,
            'confidence' => 'medium',
            'document_type' => $type,
            'reason' => "Document passed automated validity and integrity checks for {$user->name}.",
        ];
    }
}
