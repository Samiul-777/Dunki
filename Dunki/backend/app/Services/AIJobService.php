<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;

class AIJobService
{
    /**
     * Generate structured job drafts from natural language prompt.
     */
    public function generate(string $prompt, string $agencyName): array
    {
        $jobs = $this->processPrompt($prompt, $agencyName);
        $source = env('GEMINI_API_KEY') || env('GOOGLE_API_KEY') ? 'gemini_ai' : 'built_in_ai';

        return [
            'jobs' => $jobs,
            'source' => $source,
        ];
    }

    /**
     * Autonomously generate and persist job listings in the database for the agency user.
     * The verified flag is set based on the agency's verification status.
     */
    public function autoPost(User $user, string $prompt): array
    {
        $agencyName = $user->agency ?: $user->name;
        $generatedJobs = $this->processPrompt($prompt, $agencyName);

        $isAgencyVerified = ($user->verification_status === 'verified');
        $savedJobs = [];

        foreach ($generatedJobs as $jobData) {
            $saved = $user->postedJobs()->create([
                'title' => $jobData['title'],
                'description' => $jobData['description'],
                'criteria' => $jobData['criteria'],
                'country' => $jobData['country'],
                'city' => $jobData['city'],
                'salary' => $jobData['salary'],
                'agency' => $agencyName,
                'verified' => $isAgencyVerified,
            ]);

            $savedJobs[] = $saved;
        }

        $source = env('GEMINI_API_KEY') || env('GOOGLE_API_KEY') ? 'gemini_ai' : 'built_in_ai';

        return [
            'message' => 'Successfully posted ' . count($savedJobs) . ' job(s) autonomously with AI.',
            'jobs' => $savedJobs,
            'source' => $source,
        ];
    }

    /**
     * Core AI processor: tries Gemini Free Tier first if key exists, otherwise uses the smart built-in engine.
     */
    private function processPrompt(string $prompt, string $agencyName): array
    {
        $geminiKey = env('GEMINI_API_KEY') ?: env('GOOGLE_API_KEY');

        if ($geminiKey) {
            $geminiResult = $this->callGemini($prompt, $agencyName, $geminiKey);
            if (!empty($geminiResult)) {
                return $geminiResult;
            }
        }

        return $this->smartLocalGenerator($prompt, $agencyName);
    }

    /**
     * Call Google Gemini API (gemini-1.5-flash)
     */
    private function callGemini(string $prompt, string $agencyName, string $apiKey): ?array
    {
        try {
            $systemInstruction = "You are an AI recruitment assistant for the Dunki overseas migration registry. " .
                "The agency name is '{$agencyName}'. " .
                "Analyze the user's prompt and generate 1 or more overseas job listings. " .
                "Respond ONLY with a valid JSON array of objects. Do not include markdown ticks if possible, or wrap in standard ```json ```. " .
                "Each object MUST contain keys: 'title', 'description', 'criteria', 'country', 'city', 'salary', 'agency'. " .
                "Ensure salary has currency (e.g., '2,500 SAR / month', '3,500 AED / month', '250 KWD / month', etc.). " .
                "Criteria must list required experience, trade skills, and migration requirements (passport, police clearance, medical certificate).";

            $response = Http::timeout(12)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}", [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $systemInstruction . "\n\nUser Prompt: " . $prompt],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                    'temperature' => 0.4,
                ],
            ]);

            if ($response->successful()) {
                $content = $response->json('candidates.0.content.parts.0.text');
                if ($content) {
                    $cleaned = trim($content);
                    $cleaned = preg_replace('/^```json/i', '', $cleaned);
                    $cleaned = preg_replace('/^```/', '', $cleaned);
                    $cleaned = preg_replace('/```$/', '', $cleaned);
                    $cleaned = trim($cleaned);

                    $decoded = json_decode($cleaned, true);
                    if (is_array($decoded)) {
                        if (isset($decoded['title'])) {
                            $decoded = [$decoded];
                        }
                        return array_map(function ($item) use ($agencyName) {
                            return [
                                'title' => $item['title'] ?? 'Overseas Position',
                                'description' => $item['description'] ?? 'Standard overseas recruitment position.',
                                'criteria' => $item['criteria'] ?? 'Valid passport, 2+ years experience, medical clearance.',
                                'country' => $item['country'] ?? 'Saudi Arabia',
                                'city' => $item['city'] ?? 'Riyadh',
                                'salary' => $item['salary'] ?? '2,200 SAR / month',
                                'agency' => $agencyName,
                            ];
                        }, $decoded);
                    }
                }
            }
        } catch (\Throwable $e) {
            // Fallback gracefully to smartLocalGenerator
        }

        return null;
    }

    /**
     * Smart Free Built-in Generation Engine
     */
    private function smartLocalGenerator(string $prompt, string $agencyName): array
    {
        $lower = strtolower($prompt);

        $roleCatalog = [
            'electrician' => [
                'title' => 'Certified Industrial / Building Electrician',
                'description' => 'Responsible for installing, maintaining, and testing electrical wiring, fixtures, control systems, and conduit piping on commercial/residential project sites. Adherence to safety protocols and site blueprints.',
                'criteria' => 'Trade certificate/diploma, 2+ years electrical wiring experience, basic English/Arabic communication, valid passport (minimum 1 year validity), medical fitness certificate (GAMCA approved).',
                'defaultSalary' => '2,400 SAR / month',
                'country' => 'Saudi Arabia',
                'city' => 'Riyadh',
            ],
            'plumber' => [
                'title' => 'Commercial & Residential Plumber',
                'description' => 'Perform installation of sanitary systems, water drainage pipes, pressurized water supply lines, and plumbing fixtures in new developments. Troubleshooting and pressure testing.',
                'criteria' => 'Minimum 2 years commercial plumbing experience, vocational training, ability to read piping schematics, GAMCA medical clearance, clean police record.',
                'defaultSalary' => '2,100 SAR / month',
                'country' => 'Saudi Arabia',
                'city' => 'Jeddah',
            ],
            'carpenter' => [
                'title' => 'Shuttering & Finishing Carpenter',
                'description' => 'Construction shuttering, framework fabrication, wooden formwork for concrete pouring, and interior wood finishing. Fast-paced project environment.',
                'criteria' => '2+ years shuttering or finishing carpentry experience, physical fitness for outdoor works, valid passport, medical clearance.',
                'defaultSalary' => '2,000 SAR / month',
                'country' => 'Saudi Arabia',
                'city' => 'Dammam',
            ],
            'welder' => [
                'title' => 'MIG / TIG & 6G Pipe Welder',
                'description' => 'Execute high-precision pipe welding, structural steel fabrication, and metal joint inspections conforming to ASME standards. Operate argon and arc welding machinery.',
                'criteria' => '6G / 3G welding certification, 3+ years heavy industrial experience, trade test pass certificate, valid passport, medical clearance.',
                'defaultSalary' => '2,800 SAR / month',
                'country' => 'Saudi Arabia',
                'city' => 'Jubail',
            ],
            'driver' => [
                'title' => 'Heavy & Light Duty Vehicle Driver',
                'description' => 'Safe operation of heavy transport trucks, delivery vehicles, or staff buses. Ensuring route efficiency, vehicle maintenance checks, and compliance with local traffic laws.',
                'criteria' => 'Valid GCC or local heavy driving license, minimum 3 years driving experience, clean driving history, basic GPS navigation, medical fitness test.',
                'defaultSalary' => '2,500 AED / month',
                'country' => 'United Arab Emirates',
                'city' => 'Dubai',
            ],
            'mason' => [
                'title' => 'Brick & Tile Mason',
                'description' => 'Laying bricks, concrete blocks, plastering surfaces, and precision marble/ceramic tile fixing on high-rise residential and commercial buildings.',
                'criteria' => '2+ years masonry/tiling experience, physical stamina, ability to work at heights, valid passport, medical clearance.',
                'defaultSalary' => '1,900 SAR / month',
                'country' => 'Saudi Arabia',
                'city' => 'Riyadh',
            ],
            'nurse' => [
                'title' => 'Registered Staff Nurse (Hospital / Clinic)',
                'description' => 'Provide direct patient care, monitor vital signs, administer prescribed medications, and coordinate with physician teams across hospital wards or clinics.',
                'criteria' => 'B.Sc. in Nursing or Diploma in General Nursing, Prometric / DataFlow / MOH exam pass, minimum 2 years hospital experience, valid passport.',
                'defaultSalary' => '4,500 QAR / month',
                'country' => 'Qatar',
                'city' => 'Doha',
            ],
            'waiter' => [
                'title' => 'Restaurant Waiter / Food Service Staff',
                'description' => 'Greet restaurant patrons, manage table service, present menus, handle POS orders, and ensure exceptional hospitality standards in premium hotel/dining venue.',
                'criteria' => 'Fluent in English (conversational Arabic a plus), 1+ year hospitality experience, pleasant personality, food hygiene safety certificate, medical test.',
                'defaultSalary' => '2,600 AED / month',
                'country' => 'United Arab Emirates',
                'city' => 'Dubai',
            ],
            'cleaner' => [
                'title' => 'Facilities Cleaning & Maintenance Crew',
                'description' => 'Routine cleaning, sanitation, waste disposal, and facility upkeep of commercial offices, malls, or residential complexes.',
                'criteria' => 'Hardworking, ability to follow sanitation guidelines, valid passport, clean medical examination, age 21-40.',
                'defaultSalary' => '1,500 SAR / month',
                'country' => 'Saudi Arabia',
                'city' => 'Riyadh',
            ],
            'security' => [
                'title' => 'Security Guard / Facilities Protection Officer',
                'description' => 'Monitor premises, access control gates, CCTV surveillance, and ensure strict visitor logging and emergency response preparedness.',
                'criteria' => 'Height 5ft 8in+, prior security/military or police background preferred, basic English communication, clean police clearance, medical fitness.',
                'defaultSalary' => '2,400 AED / month',
                'country' => 'United Arab Emirates',
                'city' => 'Abu Dhabi',
            ],
            'mechanic' => [
                'title' => 'Automotive & Diesel Heavy Equipment Mechanic',
                'description' => 'Inspect, diagnose, and overhaul diesel engines, hydraulic systems, transmissions, and heavy construction equipment.',
                'criteria' => 'Diploma in Automobile Engineering or equivalent vocational certificate, 3+ years heavy vehicle maintenance, tool mastery, medical clearance.',
                'defaultSalary' => '3,000 SAR / month',
                'country' => 'Saudi Arabia',
                'city' => 'Jeddah',
            ],
            'chef' => [
                'title' => 'Line Cook / Continental & Arabic Cuisine Chef',
                'description' => 'Prepare hot and cold dishes, maintain food hygiene standards, manage kitchen prep station, and follow standard recipe portions in high-volume kitchen.',
                'criteria' => 'Culinary diploma or 3+ years restaurant kitchen experience, food handler hygiene certificate, valid passport, medical clearance.',
                'defaultSalary' => '3,200 QAR / month',
                'country' => 'Qatar',
                'city' => 'Doha',
            ],
        ];

        $destinations = [
            'saudi' => ['country' => 'Saudi Arabia', 'city' => 'Riyadh', 'currency' => 'SAR'],
            'riyadh' => ['country' => 'Saudi Arabia', 'city' => 'Riyadh', 'currency' => 'SAR'],
            'jeddah' => ['country' => 'Saudi Arabia', 'city' => 'Jeddah', 'currency' => 'SAR'],
            'dammam' => ['country' => 'Saudi Arabia', 'city' => 'Dammam', 'currency' => 'SAR'],
            'qatar' => ['country' => 'Qatar', 'city' => 'Doha', 'currency' => 'QAR'],
            'doha' => ['country' => 'Qatar', 'city' => 'Doha', 'currency' => 'QAR'],
            'dubai' => ['country' => 'United Arab Emirates', 'city' => 'Dubai', 'currency' => 'AED'],
            'uae' => ['country' => 'United Arab Emirates', 'city' => 'Dubai', 'currency' => 'AED'],
            'abu dhabi' => ['country' => 'United Arab Emirates', 'city' => 'Abu Dhabi', 'currency' => 'AED'],
            'kuwait' => ['country' => 'Kuwait', 'city' => 'Kuwait City', 'currency' => 'KWD'],
            'oman' => ['country' => 'Oman', 'city' => 'Muscat', 'currency' => 'OMR'],
            'muscat' => ['country' => 'Oman', 'city' => 'Muscat', 'currency' => 'OMR'],
            'bahrain' => ['country' => 'Bahrain', 'city' => 'Manama', 'currency' => 'BHD'],
            'malaysia' => ['country' => 'Malaysia', 'city' => 'Kuala Lumpur', 'currency' => 'MYR'],
            'singapore' => ['country' => 'Singapore', 'city' => 'Singapore', 'currency' => 'SGD'],
            'romania' => ['country' => 'Romania', 'city' => 'Bucharest', 'currency' => 'EUR'],
            'poland' => ['country' => 'Poland', 'city' => 'Warsaw', 'currency' => 'EUR'],
            'italy' => ['country' => 'Italy', 'city' => 'Rome', 'currency' => 'EUR'],
        ];

        $matchedDestination = null;
        foreach ($destinations as $key => $dest) {
            if (str_contains($lower, $key)) {
                $matchedDestination = $dest;
                break;
            }
        }

        $customSalary = null;
        if (preg_match('/(\d{1,3}(?:,\d{3})*|\d+)\s*(sar|aed|qar|kwd|omr|bhd|myr|eur|usd|\$|\/|\bmonth\b)/i', $prompt, $salMatch)) {
            $customSalary = trim($salMatch[0]);
            if (!str_contains(strtolower($customSalary), 'month')) {
                $customSalary .= ' / month';
            }
        }

        $matchedRoles = [];
        foreach ($roleCatalog as $roleKey => $info) {
            if (str_contains($lower, $roleKey) || str_contains($lower, $roleKey . 's')) {
                $matchedRoles[$roleKey] = $info;
            }
        }

        if (empty($matchedRoles)) {
            $cleanTitle = ucwords(trim(preg_replace('/^(post|create|hire|need|looking for|a|an|job for|listing for)\s+/i', '', $prompt)));
            if (strlen($cleanTitle) > 50) {
                $cleanTitle = substr($cleanTitle, 0, 47) . '...';
            }

            $country = $matchedDestination ? $matchedDestination['country'] : 'Saudi Arabia';
            $city = $matchedDestination ? $matchedDestination['city'] : 'Riyadh';
            $curr = $matchedDestination ? $matchedDestination['currency'] : 'SAR';
            $salary = $customSalary ?: "2,500 {$curr} / month";

            return [[
                'title' => $cleanTitle ?: 'Skilled Overseas Professional',
                'description' => 'Recruiting qualified personnel for urgent overseas project deployment. Responsibilities include daily technical operations, safety adherence, and field execution according to project specifications.',
                'criteria' => 'Minimum 2+ years verified industry experience, relevant technical certification or trade training, valid international passport with at least 12 months validity, clear police background record, and full medical fitness certification.',
                'country' => $country,
                'city' => $city,
                'salary' => $salary,
                'agency' => $agencyName,
            ]];
        }

        $results = [];
        foreach ($matchedRoles as $info) {
            $country = $matchedDestination ? $matchedDestination['country'] : $info['country'];
            $city = $matchedDestination ? $matchedDestination['city'] : $info['city'];
            $salary = $customSalary ?: ($matchedDestination ? str_replace(['SAR', 'AED', 'QAR', 'KWD'], $matchedDestination['currency'], $info['defaultSalary']) : $info['defaultSalary']);

            $results[] = [
                'title' => $info['title'],
                'description' => $info['description'] . ' Free shared accommodation, site transportation, and medical insurance provided under standard labor regulations.',
                'criteria' => $info['criteria'],
                'country' => $country,
                'city' => $city,
                'salary' => $salary,
                'agency' => $agencyName,
            ];
        }

        return $results;
    }
}
