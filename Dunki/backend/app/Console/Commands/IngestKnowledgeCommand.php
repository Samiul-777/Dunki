<?php

namespace App\Console\Commands;

use App\Services\MongoVectorService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class IngestKnowledgeCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'dunki:ingest-knowledge {--file= : Path to markdown knowledge base file} {--export-only : Only export JSON chunks without connecting to MongoDB}';

    /**
     * The console command description.
     */
    protected $description = 'Parse DUNKI_PROJECT_KNOWLEDGE_BASE.md, compute vector embeddings, and ingest into MongoDB Atlas';

    public function handle(MongoVectorService $mongoService): int
    {
        $this->info('===========================================================');
        $this->info('  Dunki Platform: MongoDB Vector Search Knowledge Ingest  ');
        $this->info('===========================================================');

        // 1. Read Markdown and split it, or reuse the checked-in chunk archive.
        $filePath = $this->option('file') ?: base_path('../DUNKI_PROJECT_KNOWLEDGE_BASE.md');
        $usingArchive = false;
        if (!file_exists($filePath) && !$this->option('file')) {
            $filePath = base_path('DUNKI_PROJECT_KNOWLEDGE_BASE.md');
        }

        if (file_exists($filePath)) {
            $this->line("Reading markdown corpus from: <comment>{$filePath}</comment>");
            $chunks = $this->parseMarkdownToChunks(file_get_contents($filePath));
        } else {
            $archivePath = base_path('database/dunki_knowledge_chunks.json');
            if (!file_exists($archivePath)) {
                $this->error("Knowledge source not found at {$filePath} or {$archivePath}");
                return 1;
            }

            $chunks = json_decode(file_get_contents($archivePath), true);
            if (!is_array($chunks) || json_last_error() !== JSON_ERROR_NONE) {
                $this->error("Could not parse chunk archive at {$archivePath}");
                return 1;
            }
            $usingArchive = true;
            $this->line("Reading pre-chunked knowledge archive from: <comment>{$archivePath}</comment>");
        }

        // 2. Verify the corpus has usable text before embedding.
        $chunks = array_values(array_filter($chunks, fn($chunk) => is_array($chunk) && !empty($chunk['text'])));
        if (empty($chunks)) {
            $this->error('The knowledge source contains no text chunks to ingest.');
            return 1;
        }
        $this->info("Successfully parsed <comment>" . count($chunks) . "</comment> semantic knowledge chunks.");

        // 3. Export JSON for standalone mongoimport or inspection
        $exportPath = base_path('database/dunki_knowledge_chunks.json');
        if (!$usingArchive) {
            file_put_contents($exportPath, json_encode($chunks, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
            $this->line("Exported JSON chunks archive to: <info>{$exportPath}</info>");
        }

        if ($this->option('export-only')) {
            $this->info("Export-only flag supplied. Skipping remote MongoDB ingestion.");
            return 0;
        }

        // 4. Test MongoDB Atlas Connection
        $this->line("\nChecking MongoDB configuration...");
        $connStatus = $mongoService->testConnection();

        if (!$connStatus['connected']) {
            $this->warn("\n[!] MongoDB Atlas Connection Notice:");
            $this->line("    " . $connStatus['message']);
            $this->line("\n    To sync with your live MongoDB Atlas cluster:");
            $this->line("    1. Open <comment>backend/.env</comment>");
            $this->line("    2. Replace <info>MONGODB_URI</info> with your actual MongoDB Atlas connection string:");
            $this->line("       e.g. MONGODB_URI=\"mongodb+srv://admin:mySecretPassword@cluster0.mongodb.net/?retryWrites=true&w=majority\"");
            $this->line("    3. Re-run: <comment>php artisan dunki:ingest-knowledge</comment>\n");
            $this->info("Note: The JSON dataset has been generated at {$exportPath} and can also be imported via Atlas UI or mongoimport.");
            return 0;
        }

        // 5. Compute embeddings and ingest into MongoDB Atlas
        $this->info("\nConnected to MongoDB database: <comment>{$connStatus['database']}</comment>");
        $this->info("Collection: <comment>{$connStatus['collection']}</comment>");
        if (!$mongoService->hasVectorIndex()) {
            $this->warn("Atlas vector index '{$connStatus['vector_index']}' was not found. Embeddings will be stored, but semantic search requires this index (1536 dimensions, cosine similarity).");
        }
        $this->line("Computing vector embeddings with Google Gemini and ingesting chunks...\n");

        $bar = $this->output->createProgressBar(count($chunks));
        $bar->start();

        $chunksWithEmbeddings = [];
        foreach ($chunks as $chunk) {
            $chunk['embedding'] = $mongoService->generateEmbedding($chunk['text'], false, $chunk['title'] ?? null);
            if ($chunk['embedding'] === null) {
                $bar->finish();
                $this->newLine(2);
                $this->error('Gemini did not return an embedding. Check GEMINI_API_KEY, model availability, and free-tier quota; no chunks were written.');
                return 1;
            }
            $chunksWithEmbeddings[] = $chunk;
            $bar->advance();
        }
        $bar->finish();
        $this->newLine(2);

        $result = $mongoService->ingestChunks($chunksWithEmbeddings);

        if ($result['success']) {
            $this->info("SUCCESS: {$result['message']}");
            $this->line("Expected Atlas vector index: <comment>" . env('MONGODB_VECTOR_INDEX', 'vector_index') . "</comment>");
            return 0;
        } else {
            $this->error("Ingestion failed: " . $result['message']);
            return 1;
        }
    }

    /**
     * Parse markdown content into structured domain chunks using heading boundaries.
     */
    protected function parseMarkdownToChunks(string $markdown): array
    {
        $lines = explode("\n", $markdown);
        $chunks = [];

        $currentMajorDomain = 'general';
        $currentTitle = 'Dunki Platform';
        $currentText = [];
        $chunkIndex = 1;

        foreach ($lines as $line) {
            // Level 2 header: Major Section / Domain
            if (preg_match('/^##\s+([0-9]+\.\s*)?(.+)$/', $line, $matches)) {
                if (!empty($currentText)) {
                    $chunks[] = $this->buildChunk($currentMajorDomain, $currentTitle, implode("\n", $currentText), $chunkIndex++);
                    $currentText = [];
                }
                $rawTitle = trim($matches[2]);
                $currentTitle = $rawTitle;
                $currentMajorDomain = $this->inferDomain($rawTitle);
                $currentText[] = $line;
                continue;
            }

            // Level 3 header: Sub-topic
            if (preg_match('/^###\s+(.+)$/', $line, $matches)) {
                if (!empty($currentText) && count($currentText) > 4) {
                    $chunks[] = $this->buildChunk($currentMajorDomain, $currentTitle, implode("\n", $currentText), $chunkIndex++);
                    $currentText = [];
                }
                $currentTitle = trim($matches[1]);
                $currentText[] = $line;
                continue;
            }

            $currentText[] = $line;
        }

        if (!empty($currentText)) {
            $chunks[] = $this->buildChunk($currentMajorDomain, $currentTitle, implode("\n", $currentText), $chunkIndex++);
        }

        return $chunks;
    }

    /**
     * Build clean chunk record.
     */
    protected function buildChunk(string $domain, string $title, string $text, int $index): array
    {
        $cleanText = trim($text);
        $slug = Str::slug(substr($title, 0, 30));

        return [
            'chunk_id' => sprintf('dunki_%s_%03d', $slug ?: 'chunk', $index),
            'domain' => $domain,
            'title' => $title,
            'text' => $cleanText,
            'metadata' => [
                'source' => 'DUNKI_PROJECT_KNOWLEDGE_BASE.md',
                'word_count' => str_word_count($cleanText),
                'keywords' => $this->extractKeywords($title . ' ' . $cleanText),
            ],
        ];
    }

    /**
     * Infer domain tag from section title.
     */
    protected function inferDomain(string $title): string
    {
        $lower = strtolower($title);
        if (str_contains($lower, 'contract'))
            return 'contracts';
        if (str_contains($lower, 'payment') || str_contains($lower, 'fee') || str_contains($lower, 'cost') || str_contains($lower, 'sslcommerz'))
            return 'payments';
        if (str_contains($lower, 'document') || str_contains($lower, 'vault') || str_contains($lower, 'verification'))
            return 'documents';
        if (str_contains($lower, 'complaint') || str_contains($lower, 'grievance') || str_contains($lower, 'fraud'))
            return 'complaints';
        if (str_contains($lower, 'job') || str_contains($lower, 'circular') || str_contains($lower, 'recruitment'))
            return 'jobs';
        if (str_contains($lower, 'journey') || str_contains($lower, 'stage') || str_contains($lower, 'lifecycle'))
            return 'journey';
        if (str_contains($lower, 'emergency') || str_contains($lower, 'hotline') || str_contains($lower, 'embassy'))
            return 'emergency';
        if (str_contains($lower, 'faq') || str_contains($lower, 'question'))
            return 'faq';
        if (str_contains($lower, 'database') || str_contains($lower, 'schema') || str_contains($lower, 'model'))
            return 'schema';
        if (str_contains($lower, 'api') || str_contains($lower, 'endpoint') || str_contains($lower, 'rest'))
            return 'api';
        return 'general';
    }

    /**
     * Extract dominant keywords from text.
     */
    protected function extractKeywords(string $text): array
    {
        $words = array_filter(
            explode(' ', strtolower(preg_replace('/[^a-z0-9\s]/', '', $text))),
            fn($w) => strlen($w) > 4
        );
        $counts = array_count_values($words);
        arsort($counts);
        return array_slice(array_keys($counts), 0, 8);
    }
}
