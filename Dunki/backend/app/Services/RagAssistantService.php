<?php

namespace App\Services;

use App\Models\JobListing;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RagAssistantService
{
    protected MongoVectorService $mongoVectorService;
    private ?array $lastGeminiDiagnostic = null;

    public function __construct(?MongoVectorService $mongoVectorService = null)
    {
        $this->mongoVectorService = $mongoVectorService ?? app(MongoVectorService::class);
    }

    /**
     * Curated knowledge corpus of the Dunki Platform, BMET regulations,
     * contracts, payments, documents, complaints, and worker welfare.
     * Used as in-memory fallback when MongoDB is not available.
     */
    protected array $knowledgeBase = [
        [
            'id' => 'platform_mission',
            'title' => 'Dunki Platform Mission & Overview',
            'keywords' => ['dunki', 'platform', 'what is', 'mission', 'about', 'safe migration', 'registry', 'tracking id', 'dalal', 'middleman'],
            'content' => "Dunki is Bangladesh's official digital registry and protection platform for overseas migrant workers. Its primary mission is eradicating exploitative illegal migration ('Dunki routes'), unauthorized sub-agents ('dalals'), visa fraud, and extortive recruitment fees. Every registered worker receives a verifiable unique Tracking ID (e.g., DNK-2026-004821) linked to their official government clearance, biometric data, contracts, and payment records.",
        ],
        [
            'id' => 'account_and_login_policy',
            'title' => 'Account Registration & Login Policy',
            'keywords' => ['login', 'log in', 'account', 'register', 'guest', 'without logging in', 'without login', 'unregistered'],
            'content' => "To access personalized services on Dunki—including executing SSLCommerz payments, applying for overseas jobs, and submitting tracked BMET grievances—workers must be registered and logged in. Public visitors can freely search verified overseas job circulars and view legal BMET cost ceilings, but financial and legal transactions strictly require an authenticated Tracking ID for security and official audit.",
        ],
        [
            'id' => 'contract_policy',
            'title' => 'Contract Policy & Migrant Worker Permissions',
            'keywords' => ['contract', 'create contract', 'add contract', 'worker contract', 'why cannot add', 'issue contract', 'agency contract', 'agreement', 'terms', 'salary'],
            'content' => "CRITICAL POLICY: Migrant workers CANNOT create or add contracts on Dunki. Contracts are legally binding instruments that must strictly be issued by accredited, verified recruiting agencies or employers and validated by BMET. Workers can view the official contracts they are under, inspect terms (working hours, salary in foreign currency like SAR/AED, accommodation, medical insurance, and overtime), and verify official BMET registration. If an agency promises different terms verbally than what is in the digital contract, workers should file an immediate Contract Discrepancy complaint.",
        ],
        [
            'id' => 'contract_clauses',
            'title' => 'Standard Contract Clauses & Discrepancy Redressal',
            'keywords' => ['contract terms', 'overtime', 'working hours', 'food allowance', 'accommodation', 'repatriation', 'contract substitution', 'discrepancy'],
            'content' => "Standard BMET-compliant overseas contracts must stipulate: 1) Working hours (maximum 8 hours/day, 48 hours/week), 2) Overtime compensation (minimum 1.5x regular wage), 3) Free employer-provided bachelor accommodation and medical insurance, 4) Round-trip airfare and emergency repatriation guarantee, and 5) 30 days paid annual leave every 2 years. If an employer or agency alters these terms upon arrival (Contract Substitution), it violates the Overseas Employment and Migrants Act 2013 and is subject to immediate ministry penal action.",
        ],
        [
            'id' => 'payment_ledger_sslcommerz',
            'title' => 'SSLCommerz Payment Gateway & Fee Ledger',
            'keywords' => ['payment', 'pay', 'sslcommerz', 'bkash', 'nagad', 'gateway', 'online payment', 'fee', 'how to pay', 'transaction', 'receipt'],
            'content' => "Dunki features full real-time payment gateway integration with SSLCommerz. Migrant workers can directly pay legitimate government fees, agency processing deposits, BMET Smart Card charges, and medical fees via bKash, Nagad, Rocket, debit/credit cards, and internet banking. Every online payment generates a verified transaction record with Bank Transaction ID and official downloadable receipt. For payments made in cash at bank branches, workers can upload physical deposit slips to the Recruitment Cost Ledger to maintain unassailable legal proof.",
        ],
        [
            'id' => 'bmet_cost_caps',
            'title' => 'Official BMET Legal Cost Caps & Overcharge Protection',
            'keywords' => ['cost cap', 'legal limit', 'ceiling', 'maximum fee', 'how much', 'saudi arabia fee', 'malaysia fee', 'qatar fee', 'uae fee', 'overcharge', 'illegal fee', 'extortion'],
            'content' => "The Government of Bangladesh (BMET) mandates strict legal cost ceilings for overseas recruitment:\n- Saudi Arabia: ৳1,65,000 maximum ceiling\n- Malaysia: ৳78,990 maximum ceiling\n- Qatar: ৳1,00,000 maximum ceiling\n- United Arab Emirates (UAE): ৳1,07,700 maximum ceiling\n- Kuwait: ৳1,06,500 maximum ceiling\n- Oman: ৳1,00,500 maximum ceiling\n- Singapore: ৳2,62,000 maximum ceiling\n- Other / General Destinations: ৳1,50,000 default ceiling\nDunki's Recruitment Cost Ledger automatically flags any worker whose total recorded payments exceed their destination ceiling with 'Fee Overcharge Detected'. Charging beyond these government ceilings is a criminal offense under Section 31 of the Overseas Employment Act 2013.",
        ],
        [
            'id' => 'document_vault',
            'title' => 'Document Vault & Mandatory Clearance Certificates',
            'keywords' => ['document', 'vault', 'upload document', 'nid', 'passport', 'medical', 'gamca', 'police clearance', 'training certificate', 'smart card'],
            'content' => "To legally migrate from Bangladesh, workers must store and verify 5 mandatory documents in the Document Vault:\n1) National ID (NID) card\n2) International E-Passport / MRP with at least 1 year validity\n3) Medical Fitness Report from a GAMCA-accredited medical center (fit for Gulf/destination)\n4) BMET 3-day Pre-departure Training Certificate & BMET Smart Card\n5) Police Clearance Certificate (issued within last 6 months)\nDocuments uploaded to Dunki are checked via automated AI verification to confirm legitimacy before embassy visa stamping.",
        ],
        [
            'id' => 'complaints_redressal',
            'title' => 'Complaints & Grievance Redressal (BMET Escalation)',
            'keywords' => ['complaint', 'file complaint', 'grievance', 'report agency', 'fraud', 'stolen money', 'passport withheld', 'bmet escalation', 'action'],
            'content' => "Workers and families can submit formal grievances against recruiting agencies, brokers, or employers.\nCategories include: 1) Overcharging / Illegal Fees, 2) Visa Fraud, 3) Contract Substitution, 4) Document / Passport Confiscation, 5) Wage Theft, 6) Physical/Verbal Abuse, and 7) Stranded Worker Emergency.\nEach complaint is assigned a tracking number (e.g., CMP-2026-00128) and can be escalated directly to the BMET Vigilance Cell and Ministry of Expatriates' Welfare for license suspension and compensation recovery.",
        ],
        [
            'id' => 'job_search_applications',
            'title' => 'Job Search & Authentic Overseas Circulars',
            'keywords' => ['job', 'job search', 'apply', 'circular', 'overseas vacancy', 'hiring', 'work abroad', 'application'],
            'content' => "Dunki hosts certified overseas job circulars posted directly by authorized, verified recruitment agencies. Circulars display verified wage rates, accommodation details, trade criteria, and country. Workers can apply directly through the platform with their verified profile and credentials, bypassing unauthorized middlemen.",
        ],
        [
            'id' => 'emergency_hotlines',
            'title' => 'Emergency Contacts & Embassy Labor Wings',
            'keywords' => ['emergency', 'hotline', 'helpline', 'phone number', 'embassy', 'contact', 'police', 'help', 'stranded', 'saudi embassy', 'uae embassy', 'qatar embassy'],
            'content' => "Emergency Assistance & Official Helplines:\n- BMET 24/7 Expatriate Helpline: 13355 or +88028300300\n- Wage Earners' Welfare Board (WEWB) Call Center: 16135\n- Prabashi Kallyan Desk (Hazrat Shahjalal Int'l Airport): +88028901460\n- Bangladesh Embassy Riyadh (Labor Wing): +966-11-4195300\n- Bangladesh Consulate General Jeddah: +966-12-6878465\n- Bangladesh Embassy Abu Dhabi: +971-2-4465100\n- Bangladesh Consulate General Dubai: +971-4-2252484\n- Bangladesh Embassy Doha, Qatar: +974-44671988\n- Bangladesh High Commission Kuala Lumpur, Malaysia: +60-3-26919255",
        ],
    ];

    /**
     * Main entry point — the proper RAG pipeline:
     *
     * 1. Retrieve context from MongoDB vector search (or local knowledge base fallback)
     * 2. Build user profile context
     * 3. Pass EVERYTHING to Gemini — let it answer using its own intelligence + the context
     * 4. If Gemini is unreachable, use a simple local fallback (not rigid pattern matching)
     */
    public function answer(string $query, ?User $user = null, array $history = []): array
    {
        $this->lastGeminiDiagnostic = null;
        $trimmed = trim($query);

        $commonReply = $this->handleCommonQueries($trimmed, $user);
        if ($commonReply !== null) {
            return $commonReply;
        }

        // Step 1: Retrieve relevant context (MongoDB first, then local)
        $retrievedChunks = $this->retrieveRelevantChunks($trimmed, 4);

        // Step 2: Build user context string
        $userContext = $this->buildUserContext($user);

        // Step 3: Call Gemini — it is the SOLE answerer, not a supplement
        $geminiKey = config('services.gemini.api_key');

        if ($geminiKey) {
            $aiReply = $this->callGemini($trimmed, $retrievedChunks, $userContext, $history, $geminiKey);
            if ($aiReply !== null) {
                // Check if Gemini flagged th e query as out-of-domain
                $isOutOfDomain = str_starts_with(trim($aiReply), '[OUT_OF_DOMAIN]');
                $cleanReply = $isOutOfDomain
                    ? trim(substr(trim($aiReply), strlen('[OUT_OF_DOMAIN]')))
                    : $aiReply;

                return [
                    'reply' => $cleanReply,
                    'is_out_of_domain' => $isOutOfDomain,
                    'sources' => array_column($retrievedChunks, 'title'),
                ];
            }
        } else {
            $this->lastGeminiDiagnostic = ['code' => 'GEMINI_KEY_MISSING'];
            Log::warning('Gemini API key is not configured in Laravel services config.');
        }

        // Step 4: Gemini unavailable — graceful local fallback
        $result = [
            'reply' => $this->localFallback($trimmed, $retrievedChunks, $user),
            'is_out_of_domain' => false,
            'sources' => array_column($retrievedChunks, 'title'),
        ];

        if ($this->lastGeminiDiagnostic && (config('app.debug') || ($user && $user->role === 'admin'))) {
            $result['diagnostic'] = $this->lastGeminiDiagnostic;
        }

        return $result;
    }

    /**
     * Handle directly resolvable user and platform questions before falling back to the project knowledge base.
     */
    private function handleCommonQueries(string $query, ?User $user): ?array
    {
        $q = strtolower(trim($query));

        if ($user && preg_match('/(who\s+am\s+i|what(?:\s+is|\'s)?\s+my\s+(?:username|user\s+name)|my\s+name\s+on\s+the\s+platform)/i', $query)) {
            $displayName = $user->name ?? 'there';
            $trackingId = $user->tracking_id ?: 'Not assigned yet';

            return [
                'reply' => "Hello {$displayName}!\n\nYour username on the platform is **{$displayName}**.\n\nYour tracking ID is **{$trackingId}** and it is linked to your official records for verification and migration support.",
                'is_out_of_domain' => false,
                'sources' => ['User profile'],
            ];
        }

        if (preg_match('/(what\s+jobs?\s+(?:are\s+)?(?:currently\s+)?available|jobs?\s+currently\s+available|show\s+me\s+jobs?|available\s+jobs?)/i', $query)) {
            $jobs = JobListing::query()->with('creator:id,name,agency')->latest()->limit(5)->get();

            if ($jobs->isEmpty()) {
                return [
                    'reply' => "There are currently no active job listings posted on the platform. Please check back soon or ask a verified agency to post a new circular.",
                    'is_out_of_domain' => false,
                    'sources' => ['Live job listings'],
                ];
            }

            $lines = [];
            foreach ($jobs as $job) {
                $agency = $job->agency ?: ($job->creator->agency ?? $job->creator->name ?? 'Agency');
                $lines[] = "- **{$job->title}** — {$job->country} / {$job->city} • {$job->salary} • {$agency}";
            }

            return [
                'reply' => "I found " . count($lines) . " current job listing(s) on the platform:\n\n" . implode("\n", $lines),
                'is_out_of_domain' => false,
                'sources' => ['Live job listings'],
            ];
        }

        $destinationIntent = preg_match('/\b(destination|destinations|country|countries|abroad|overseas|where\s+(?:should|can|do)\s+i\s+(?:go|work|migrate))\b/i', $query);
        $agencyIntent = preg_match('/\b(agency|agencies|recruiter|recruiters|recruiting|recruitment|agent)\b/i', $query);
        $adviceIntent = preg_match('/\b(how|which|what|where|select|choose|pick|find|decide|recommend|best|right|suitable)\b/i', $query);

        if ($destinationIntent && $agencyIntent && $adviceIntent) {
            return [
                'reply' => "To choose a destination and recruiting agency on Dunki:\n\n1. Open **Job search** and search by the country or type of work you want. Compare the job location, salary, and eligibility criteria before deciding.\n2. Turn on **Verified only** to narrow the results to listings posted by verified agencies.\n3. Open a listing to review its details and agency, then apply directly through Dunki if it suits you.\n4. Before accepting, check that the written contract matches the job and salary, and compare all requested fees with the BMET limit for that destination. Don't pay unrecorded cash to an intermediary.\n\nChoose a destination that fits your qualifications, health, and budget; don't select based on an agency's promise alone.",
                'is_out_of_domain' => false,
                'sources' => ['Job search and verified agencies'],
            ];
        }

        if (
            preg_match('/\b(agency|agencies|recruiter|recruiters|agent)\b/i', $query)
            && preg_match('/\b(job|jobs|vacanc\w*|opening\w*|circular|offer)\b/i', $query)
            && preg_match('/\b(verify|verified|genuine|legitimate|real|trust|authentic|safe)\w*\b/i', $query)
        ) {
            return [
                'reply' => "To check a job and recruiter on Dunki:\n\n1. Open **Job search** and turn on **Verified only**. This filters for listings posted by agencies Dunki marks as verified.\n2. Review the agency name, country, salary, and eligibility criteria. Before accepting, make sure the written contract matches the offer.\n3. Verify the agency's license through BMET or another official channel using contact details you find independently.\n\nA Dunki verified badge reflects the agency's verification status; it is not a guarantee of every job term or visa. Keep receipts and don't pay unrecorded cash to an intermediary.",
                'is_out_of_domain' => false,
                'sources' => ['Job search and verified agencies'],
            ];
        }

        if (preg_match('/(can\s+i\s+post\s+a\s+job|post\s+a\s+job|can\s+I\s+create\s+a\s+job|create\s+job\s+listing|job\s+listing\s+permission)/i', $query)) {
            if (!$user) {
                return [
                    'reply' => "You need to be logged in to post a job. Only registered agencies can publish job listings on Dunki.",
                    'is_out_of_domain' => false,
                    'sources' => ['Authorization policy'],
                ];
            }

            if ($user->role === 'agency') {
                return [
                    'reply' => "Yes — as an **agency**, you can post a job listing on Dunki.\n\nYour role must be set to **agency**, and the listing is typically verified based on your agency status and compliance records.",
                    'is_out_of_domain' => false,
                    'sources' => ['Authorization policy'],
                ];
            }

            return [
                'reply' => "No — only **agencies** can post job listings on Dunki. Workers and nominees do not have permission to publish jobs directly. If you are an agency, log in with the agency account and try again.",
                'is_out_of_domain' => false,
                'sources' => ['Authorization policy'],
            ];
        }

        if (preg_match('/(pay\s+(?:another|someone|other)|make\s+a\s+payment\s+to\s+(?:another|someone|other)|payment\s+to\s+(?:another|someone|other)|send\s+money\s+to\s+(?:another|someone|other)|transfer\s+money\s+to\s+(?:another|someone|other))/i', $query)) {
            return [
                'reply' => "Direct payment to another user is **not supported** on Dunki. The platform is designed for **official migration-related payments** such as BMET fees, agency payments, and documented service fees through **SSLCommerz**.\n\nIf you need to pay an accredited recruiting agency or a government-related fee, use the payment flow in your account and keep the payment receipt. You cannot send personal money directly to another individual user.",
                'is_out_of_domain' => false,
                'sources' => ['Payment policy'],
            ];
        }

        return null;
    }

    /**
     * Call Gemini API with the full RAG context.
     *
     * Gemini handles EVERYTHING:
     * - Greetings / small talk → responds warmly and naturally
     * - Platform questions → answers using injected context + its own knowledge
     * - Off-topic queries → returns [OUT_OF_DOMAIN] prefix so we can flag it
     * - Personalized replies → uses user profile data when relevant
     */
    private function callGemini(
        string $query,
        array $chunks,
        string $userContext,
        array $history,
        string $apiKey
    ): ?string {
        if (empty($apiKey)) {
            $this->lastGeminiDiagnostic = ['code' => 'GEMINI_KEY_MISSING'];
            return null;
        }

        // Build context block from retrieved chunks
        $contextBlock = '';
        foreach ($chunks as $idx => $chunk) {
            $num = $idx + 1;
            $title = $chunk['title'] ?? 'Knowledge';
            $content = $chunk['content'] ?? $chunk['text'] ?? '';
            $contextBlock .= "[Context {$num} — {$title}]\n{$content}\n\n";
        }

        $systemPrompt = <<<EOT
You are Dunki's AI Migration Advisor — a warm, knowledgeable, and conversational assistant built into Bangladesh's official overseas migrant worker protection platform.

YOUR ROLE:
- Help migrant workers, their families, and agencies understand the Dunki platform, BMET regulations, contracts, legal recruitment fees, documents, complaints, and worker rights.
- You answer using your OWN intelligence and the platform context provided below. You are NOT a document reader — you think, reason, and explain naturally like a smart, empathetic advisor.
- You deeply understand Bangladesh's overseas employment system, labor law, and the challenges workers face.

CORE RULES:
1. BE NATURAL & CONVERSATIONAL: Match the user's tone. If they ask a short question, give a short answer. If they need detail, give detail. Never be robotic.
2. BE DIRECT FIRST: For Yes/No questions, lead with a clear Yes or No, then explain briefly why. Don't bury the answer in a wall of text.
3. GROUND PLATFORM CLAIMS: The supplied context is the authority for Dunki features, policies, procedures, and verification status. Never claim that Dunki, a listing, an agency, BMET, or another authority verified a specific job unless the supplied context explicitly says so. A schema field or feature does not prove every record has that status. If a platform detail is missing, say it is not specified.
4. SEPARATE GENERAL GUIDANCE: You may give cautious general migration advice when the context does not cover a question, but clearly distinguish it from Dunki's actual features or official BMET policy. Do not invent legal limits, approvals, partnerships, or guarantees.
5. GREETINGS & SMALL TALK: Respond warmly and briefly, then gently invite them to ask about migration or the platform. Keep it natural.
6. OUT OF DOMAIN: ONLY if someone asks something completely irrelevant to migration, work, travel, Bangladesh, or the platform (e.g., cooking recipes, sports scores, coding tutorials, math homework), start your response with the exact text [OUT_OF_DOMAIN] followed by a friendly, brief redirect. Be generous — if there's any reasonable connection to migration, work, or Bangladesh, just answer it.
7. PERSONALIZATION: When user profile data is available below, reference it naturally when relevant (e.g., "Since you're heading to Saudi Arabia..." or "You've paid ৳X so far..."). Don't dump their entire profile unprompted.
8. FORMAT: Use markdown (bold, bullets, headers) when it helps readability. Don't over-format short conversational replies. Use emojis sparingly and naturally.

PLATFORM KNOWLEDGE BASE:
{$contextBlock}

CURRENT USER:
{$userContext}
EOT;

        // Build conversation history for multi-turn
        $contents = [];
        foreach ($history as $turn) {
            $role = ($turn['role'] ?? 'user') === 'assistant' ? 'model' : 'user';
            $text = $turn['content'] ?? '';
            if (!empty($text)) {
                $contents[] = [
                    'role' => $role,
                    'parts' => [['text' => $text]],
                ];
            }
        }

        // Add the current user message
        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $query]],
        ];

        // Try the configured model first, then other current Flash models if it is unavailable.
        $models = array_values(array_unique([
            config('services.gemini.generation_model', 'gemini-3.8-flash'),
            'gemini-3.7-flash',
            'gemini-3.6-flash',
            'gemini-3.5-flash',
            'gemini-3.5-flash-lite',
        ]));

        foreach ($models as $model) {
            try {
                $response = Http::timeout(20)
                    ->withHeaders(['x-goog-api-key' => $apiKey])
                    ->post(
                        "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent",
                        [
                            'systemInstruction' => [
                                'parts' => [['text' => $systemPrompt]],
                            ],
                            'contents' => $contents,
                            'generationConfig' => [
                                'temperature' => 0.7,
                                'maxOutputTokens' => 1024,
                                'topP' => 0.9,
                            ],
                        ]
                    );

                if ($response->successful()) {
                    $text = $this->extractGeminiText($response->json());
                    if (!empty($text)) {
                        return trim($text);
                    }

                    $this->lastGeminiDiagnostic = [
                        'code' => 'GEMINI_EMPTY_RESPONSE',
                        'model' => $model,
                        'status' => $response->status(),
                    ];
                }

                $status = $response->status();
                if (!$response->successful()) {
                    $this->lastGeminiDiagnostic = [
                        'code' => "GEMINI_HTTP_{$status}",
                        'model' => $model,
                        'status' => $status,
                    ];
                    Log::warning('Gemini generation request failed.', [
                        'model' => $model,
                        'status' => $status,
                        'provider_status' => $response->json('error.status'),
                    ]);
                }

                // Auth or model-access failures should stop retrying the same key set,
                // but 404/unsupported-model responses can still be retried on the next model.
                if ($status === 401 || $status === 403) {
                    break;
                }

            } catch (\Throwable $e) {
                $this->lastGeminiDiagnostic = [
                    'code' => 'GEMINI_NETWORK_ERROR',
                    'model' => $model,
                ];
                Log::warning('Gemini generation request could not be completed.', [
                    'model' => $model,
                    'exception' => get_class($e),
                ]);
            }
        }

        return null;
    }

    /**
     * Extract the first textual response from a Gemini candidate payload.
     */
    private function extractGeminiText(array $payload): ?string
    {
        $candidates = $payload['candidates'] ?? [];

        foreach ($candidates as $candidate) {
            $parts = $candidate['content']['parts'] ?? [];

            foreach ($parts as $part) {
                if (isset($part['text']) && trim((string) $part['text']) !== '') {
                    return trim((string) $part['text']);
                }
            }
        }

        return null;
    }

    /**
     * Retrieve the most relevant knowledge chunks.
     * Priority: MongoDB vector search → local keyword scoring → generic fallback.
     */
    public function retrieveRelevantChunks(string $query, int $topK = 4): array
    {
        // 1. Try MongoDB Atlas vector search first (semantically rich)
        if ($this->mongoVectorService->isConfigured()) {
            try {
                $vectorResults = $this->mongoVectorService->vectorSearch($query, $topK);
                if (!empty($vectorResults)) {
                    $formatted = [];
                    foreach ($vectorResults as $res) {
                        $content = $res['text'] ?? '';
                        // Skip internal developer/technical metadata docs
                        if (str_contains($content, 'Target System:') || str_contains($content, 'Embedding Target:')) {
                            continue;
                        }
                        $formatted[] = [
                            'id' => $res['chunk_id'] ?? 'mongo_chunk',
                            'title' => $res['title'] ?? 'Dunki Platform Knowledge',
                            'content' => $content,
                            'source' => 'mongodb_vector_search',
                        ];
                    }
                    if (!empty($formatted)) {
                        return $formatted;
                    }
                }
            } catch (\Throwable $e) {
                Log::info('MongoDB vector search failed in RagAssistantService: ' . $e->getMessage());
            }
        }

        // 2. Local knowledge base keyword scoring
        $queryTokens = $this->tokenize($query);
        $scored = [];

        foreach ($this->knowledgeBase as $chunk) {
            $score = 0;
            $haystack = strtolower($chunk['title'] . ' ' . implode(' ', $chunk['keywords']) . ' ' . $chunk['content']);

            foreach ($queryTokens as $token) {
                if (strlen($token) < 3) {
                    continue;
                }

                foreach ($chunk['keywords'] as $kw) {
                    if (str_contains($kw, $token) || str_contains($token, $kw)) {
                        $score += 4.0;
                    }
                }

                if (str_contains(strtolower($chunk['title']), $token)) {
                    $score += 3.0;
                }

                $count = substr_count($haystack, $token);
                if ($count > 0) {
                    $score += min($count, 5) * 1.0;
                }
            }

            if ($score > 0) {
                $scored[] = ['chunk' => $chunk, 'score' => $score];
            }
        }

        if (!empty($scored)) {
            usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
            return array_map(fn($item) => $item['chunk'], array_slice($scored, 0, $topK));
        }

        // 3. Generic fallback: return broadly relevant chunks
        return [
            $this->knowledgeBase[0], // mission
            $this->knowledgeBase[4], // payments
            $this->knowledgeBase[5], // cost caps
            $this->knowledgeBase[7], // complaints
        ];
    }

    /**
     * Build rich user context string for the Gemini prompt.
     */
    private function buildUserContext(?User $user): string
    {
        if (!$user) {
            return 'The user is a public visitor (not logged in). They cannot access payment, contract, or complaint features without registering first.';
        }

        $role = ucfirst($user->role ?? 'user');
        if (!filter_var(config('services.gemini.share_user_context', false), FILTER_VALIDATE_BOOL)) {
            return "The authenticated user has the {$role} role. Personal profile details are not available to the AI assistant.";
        }

        $trackingId = $user->tracking_id ?: 'Not yet assigned';
        $destinationContext = app(DestinationService::class)->forUser($user);
        $destination = $destinationContext['effective_destination'] ?: 'Not set';
        $status = $user->verification_status ?? 'pending';

        $ctx = "Logged-in user:
- Name: {$user->name}
- Role: {$role}
- Tracking ID: {$trackingId}
- Destination Country: {$destination}
- Verification Status: {$status}";

        if (($user->role ?? '') === 'worker') {
            try {
                $contractCount = $user->contracts()->count();
                $payments = $user->payments()->get();
                $totalPaid = $payments->sum('amount');
                $paymentCount = $payments->count();
                $complaintsCount = $user->complaints()->count();
                $docsCount = $user->documents()->where('status', 'complete')->count();

                $ctx .= "\n- Contracts: {$contractCount}"
                    . "\n- Total paid: ৳" . number_format($totalPaid) . " ({$paymentCount} transactions)"
                    . "\n- Complaints filed: {$complaintsCount}"
                    . "\n- Verified documents: {$docsCount}/5";
            } catch (\Throwable $e) {
                // Relations unavailable — skip silently
            }
        }

        return $ctx;
    }

    /**
     * Graceful local fallback when Gemini API is completely unreachable.
     * Returns a simple but helpful response grounded in retrieved chunks.
     */
    private function localFallback(string $query, array $chunks, ?User $user): string
    {
        $name = $user ? " {$user->name}" : '';

        if (empty($chunks)) {
            return "The Gemini AI service is currently unavailable for this account or model configuration. Please verify the Gemini API key and model access, then try again. For immediate support, contact BMET on **13355** (24/7).";
        }

        // Check for simple greetings locally
        $clean = strtolower(trim(preg_replace('/[^\p{L}\p{N}\s]/u', '', $query)));
        $greetings = ['hi', 'hello', 'hey', 'salam', 'assalamu alaikum', 'assalamualaikum', 'good morning', 'good afternoon', 'good evening'];
        if (in_array($clean, $greetings, true)) {
            return "Hello{$name}! 👋 Welcome to Dunki. I'm your AI Migration Advisor.\n\nHow can I help you today? You can ask me about:\n- 💳 Payments & SSLCommerz\n- 📄 Contracts & terms\n- 💰 BMET legal fee caps\n- 📁 Required documents\n- 🚨 Filing complaints\n- ☎️ Emergency helplines";
        }

        // Check for courtesies
        $courtesies = ['thank you', 'thanks', 'thx', 'bye', 'goodbye', 'ok', 'okay', 'got it', 'alright'];
        if (in_array($clean, $courtesies, true)) {
            return "You're welcome{$name}! Feel free to ask anytime you need help with migration, contracts, fees, or anything else. Stay safe! 🙏";
        }

        if ($this->shouldUsePlainFallback($query, $chunks)) {
            return "I’m temporarily unable to reach the live AI service for your request. Please try again in a moment, or contact BMET on **13355** for immediate support.\n\nI can still help with Dunki topics like:\n- payment and fees\n- contracts and legal worker rights\n- document checklist\n- complaints and helplines";
        }

        // Knowledge-base chunks are only for grounding, not as the final answer body.
        // If the AI service is unavailable, avoid copying long project-doc text into the user reply.
        $summary = "I’m temporarily unable to reach the live AI service for your request. Please try again in a moment, or contact BMET on **13355** for immediate support.";

        if (preg_match('/(payment|fee|contract|document|complaint|helpline|job|agency|login|tracking)/i', $query)) {
            $summary .= "\n\nI can still help with common Dunki topics such as fee ceilings, contract rules, document requirements, and complaint escalation.";
        }

        return $summary;
    }

    /**
     * Knowledge-base material should be used as retrieval context only, never as a final answer.
     */
    private function shouldUsePlainFallback(string $query, array $chunks): bool
    {
        $normalized = strtolower(trim($query));

        if ($normalized === '') {
            return true;
        }

        $docBoilerplate = ['mission and problem space', 'backend stack', 'frontend stack', 'monorepo directory hierarchy', 'authentication & token workflow'];
        $titles = implode(' ', array_map(function ($chunk) {
            return strtolower((string) ($chunk['title'] ?? ''));
        }, $chunks));

        foreach ($docBoilerplate as $marker) {
            if (str_contains($titles, $marker)) {
                return true;
            }
        }

        return preg_match('/^(how are you|who are you|what can you do|help me|tell me about the project|what is this project|how does the app work)/i', $normalized) === 1;
    }

    /**
     * Clean and tokenize query into lowercase words.
     */
    private function tokenize(string $text): array
    {
        $clean = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', strtolower($text));
        return array_values(array_filter(explode(' ', $clean), fn($w) => strlen($w) > 1));
    }
}
