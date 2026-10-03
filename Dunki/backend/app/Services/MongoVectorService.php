<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use MongoDB\Client as MongoClient;

class MongoVectorService
{
    private const EMBEDDING_DIMENSIONS = 1536;

    protected ?string $uri;
    protected string $database;
    protected string $collectionName;
    protected string $vectorIndex;
    protected string $embeddingModel;
    protected ?MongoClient $client = null;

    public function __construct()
    {
        $this->uri = env('MONGODB_URI');
        $this->database = env('MONGODB_DATABASE', 'dunki_db');
        $this->collectionName = env('MONGODB_COLLECTION', 'dunki_knowledge_chunks');
        $this->vectorIndex = env('MONGODB_VECTOR_INDEX', 'vector_index');
        $this->embeddingModel = env('MONGODB_EMBEDDING_MODEL', 'gemini-embedding-2');
    }

    /**
     * Determine if MongoDB credentials are fully configured (not default placeholders).
     */
    public function isConfigured(): bool
    {
        if (empty($this->uri)) {
            return false;
        }

        // Check for placeholder substrings
        if (str_contains($this->uri, '<username>') || str_contains($this->uri, '<password>')) {
            return false;
        }

        return true;
    }

    /**
     * Get or initialize MongoDB client instance.
     */
    public function getClient(): ?MongoClient
    {
        if (!$this->isConfigured()) {
            return null;
        }

        if ($this->client === null) {
            try {
                $this->client = new MongoClient($this->uri, [], [
                    'serverSelectionTimeoutMS' => 3000,
                ]);
            } catch (Exception $e) {
                Log::warning('MongoDB Client initialization failed: ' . $e->getMessage());
                return null;
            }
        }

        return $this->client;
    }

    /**
     * Test MongoDB connection and report collection metrics.
     */
    public function testConnection(): array
    {
        if (!$this->isConfigured()) {
            return [
                'connected' => false,
                'message' => 'MongoDB URI contains placeholder credentials (<username>:<password>). Please update .env with your Atlas cluster details.',
                'database' => $this->database,
                'collection' => $this->collectionName,
            ];
        }

        try {
            $client = $this->getClient();
            if (!$client) {
                throw new Exception('Could not instantiate MongoDB client.');
            }

            // Ping admin database
            $db = $client->selectDatabase($this->database);
            $command = new \MongoDB\Driver\Command(['ping' => 1]);
            $client->getManager()->executeCommand($this->database, $command);

            $collection = $db->selectCollection($this->collectionName);
            $chunkCount = $collection->countDocuments();

            return [
                'connected' => true,
                'message' => 'Successfully connected to MongoDB Atlas database.',
                'database' => $this->database,
                'collection' => $this->collectionName,
                'document_count' => $chunkCount,
                'vector_index' => $this->vectorIndex,
            ];
        } catch (Exception $e) {
            return [
                'connected' => false,
                'message' => 'MongoDB connection error: ' . $e->getMessage(),
                'database' => $this->database,
                'collection' => $this->collectionName,
            ];
        }
    }

    /**
     * Check whether the configured Atlas Vector Search index exists.
     */
    public function hasVectorIndex(): bool
    {
        try {
            $client = $this->getClient();
            if (!$client) {
                return false;
            }

            $collection = $client->selectDatabase($this->database)->selectCollection($this->collectionName);
            foreach ($collection->listSearchIndexes(['name' => $this->vectorIndex]) as $index) {
                $indexData = (array) $index;
                if (($indexData['name'] ?? null) === $this->vectorIndex) {
                    return true;
                }
            }
        } catch (\Throwable $e) {
            Log::info('Could not verify the configured Atlas vector index.', ['index' => $this->vectorIndex]);
        }

        return false;
    }

    /**
     * Generate dense vector embedding for text using Google Gemini Embedding API.
     */
    public function generateEmbedding(string $text, bool $isQuery = false, ?string $title = null): ?array
    {
        $apiKey = env('GEMINI_API_KEY') ?: env('GOOGLE_API_KEY');

        if (empty($apiKey)) {
            return null;
        }

        $cleanText = mb_substr(trim($text), 0, 8000);
        $embeddingInput = $isQuery
            ? "task: question answering | query: {$cleanText}"
            : 'title: ' . ($title ?: 'none') . " | text: {$cleanText}";

        try {
            $response = Http::timeout(20)
                ->withHeaders(['x-goog-api-key' => $apiKey])
                ->post(
                    "https://generativelanguage.googleapis.com/v1beta/models/{$this->embeddingModel}:embedContent",
                    [
                        'model' => "models/{$this->embeddingModel}",
                        'content' => ['parts' => [['text' => $embeddingInput]]],
                        'outputDimensionality' => self::EMBEDDING_DIMENSIONS,
                    ]
                );

            $values = $response->json('embedding.values');
            if (!$response->successful() || !is_array($values) || count($values) !== self::EMBEDDING_DIMENSIONS) {
                Log::warning('Gemini embedding request failed or returned an unexpected vector.', [
                    'model' => $this->embeddingModel,
                    'status' => $response->status(),
                ]);
                return null;
            }

            return array_map('floatval', array_values($values));
        } catch (\Throwable $e) {
            Log::warning('Gemini embedding request could not be completed.', ['model' => $this->embeddingModel]);
            return null;
        }
    }

    /**
     * Ingest structured markdown knowledge chunks into MongoDB collection.
     */
    public function ingestChunks(array $chunks): array
    {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'message' => 'MongoDB is not configured. Please supply valid MONGODB_URI in backend/.env',
                'ingested_count' => 0,
            ];
        }

        try {
            $client = $this->getClient();
            $collection = $client->selectDatabase($this->database)->selectCollection($this->collectionName);

            $ingested = 0;
            foreach ($chunks as $chunk) {
                $chunkId = $chunk['chunk_id'] ?? ('chunk_' . md5($chunk['title'] ?? uniqid()));
                $embedding = $chunk['embedding'] ?? $this->generateEmbedding(
                    $chunk['text'] ?? $chunk['content'] ?? '',
                    false,
                    $chunk['title'] ?? null
                );

                if (!is_array($embedding) || count($embedding) !== self::EMBEDDING_DIMENSIONS) {
                    return [
                        'success' => false,
                        'message' => 'A valid Gemini embedding is required for every knowledge chunk. Check the API key, model, and quota, then retry ingestion.',
                        'ingested_count' => $ingested,
                    ];
                }

                $doc = [
                    'chunk_id' => $chunkId,
                    'domain' => $chunk['domain'] ?? 'general',
                    'title' => $chunk['title'] ?? 'Dunki Platform Knowledge',
                    'text' => $chunk['text'] ?? $chunk['content'],
                    'embedding' => $embedding,
                    'metadata' => $chunk['metadata'] ?? [],
                    'updated_at' => new \MongoDB\BSON\UTCDateTime(),
                ];

                $collection->updateOne(
                    ['chunk_id' => $chunkId],
                    ['$set' => $doc],
                    ['upsert' => true]
                );

                $ingested++;
            }

            return [
                'success' => true,
                'message' => "Successfully ingested {$ingested} knowledge chunks into MongoDB Atlas.",
                'ingested_count' => $ingested,
                'collection' => $this->collectionName,
            ];
        } catch (Exception $e) {
            Log::error('Error ingesting chunks into MongoDB: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to ingest chunks: ' . $e->getMessage(),
                'ingested_count' => 0,
            ];
        }
    }

    /**
     * Perform Vector Search via MongoDB Atlas $vectorSearch aggregation pipeline.
     */
    public function vectorSearch(string $query, int $topK = 3, ?string $domainFilter = null): array
    {
        if (!$this->isConfigured()) {
            return [];
        }

        try {
            $client = $this->getClient();
            if (!$client) {
                return [];
            }

            $queryEmbedding = $this->generateEmbedding($query, true);
            if ($queryEmbedding === null) {
                return $this->textSearchFallback($query, $topK);
            }
            $collection = $client->selectDatabase($this->database)->selectCollection($this->collectionName);

            // 1. Build Atlas Vector Search stage
            $vectorSearchStage = [
                'index' => $this->vectorIndex,
                'path' => 'embedding',
                'queryVector' => $queryEmbedding,
                'numCandidates' => max($topK * 20, 50),
                'limit' => $topK,
            ];

            if ($domainFilter) {
                $vectorSearchStage['filter'] = ['domain' => $domainFilter];
            }

            $pipeline = [
                ['$vectorSearch' => $vectorSearchStage],
                [
                    '$project' => [
                        '_id' => 0,
                        'chunk_id' => 1,
                        'title' => 1,
                        'domain' => 1,
                        'text' => 1,
                        'score' => ['$meta' => 'vectorSearchScore'],
                    ],
                ],
            ];

            $cursor = $collection->aggregate($pipeline);
            $results = [];
            foreach ($cursor as $doc) {
                $results[] = (array) $doc;
            }

            if (!empty($results)) {
                return $results;
            }
        } catch (Exception $e) {
            Log::info('MongoDB Atlas $vectorSearch not available or failed: ' . $e->getMessage() . '. Trying text search fallback.');
        }

        // Fallback to text / regex search on the collection if vector index is still compiling
        return $this->textSearchFallback($query, $topK);
    }

    /**
     * Fallback keyword / regex search over collection documents.
     */
    protected function textSearchFallback(string $query, int $topK = 3): array
    {
        try {
            $client = $this->getClient();
            if (!$client)
                return [];

            $collection = $client->selectDatabase($this->database)->selectCollection($this->collectionName);
            $stopWords = ['and', 'are', 'can', 'does', 'for', 'how', 'the', 'this', 'what', 'when', 'where', 'which', 'with', 'you'];
            $tokens = array_values(array_unique(array_filter(
                explode(' ', strtolower(preg_replace('/[^a-z0-9\s]/', ' ', $query))),
                fn($token) => strlen($token) > 2 && !in_array($token, $stopWords, true)
            )));
            if (empty($tokens)) {
                return [];
            }

            $cursor = $collection->find([], [
                'projection' => ['chunk_id' => 1, 'title' => 1, 'text' => 1, 'metadata' => 1],
                'limit' => 500,
            ]);

            $scored = [];
            foreach ($cursor as $doc) {
                $arr = (array) $doc;
                $metadata = (array) ($arr['metadata'] ?? []);
                $keywords = $metadata['keywords'] ?? [];
                if ($keywords instanceof \Traversable) {
                    $keywords = iterator_to_array($keywords);
                }
                $keywordText = strtolower(implode(' ', is_array($keywords) ? array_map('strval', $keywords) : []));
                $title = strtolower((string) ($arr['title'] ?? ''));
                $text = strtolower((string) ($arr['text'] ?? ''));
                $score = 0;

                foreach ($tokens as $token) {
                    if (str_contains($title, $token)) {
                        $score += 4;
                    }
                    if (str_contains($keywordText, $token)) {
                        $score += 3;
                    }
                    $score += min(substr_count($text, $token), 2);
                }

                if ($score > 0) {
                    $scored[] = [
                        'chunk_id' => $arr['chunk_id'] ?? 'doc',
                        'title' => $arr['title'] ?? 'Knowledge',
                        'text' => $arr['text'] ?? '',
                        'score' => $score,
                    ];
                }
            }

            usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
            return array_slice($scored, 0, $topK);
        } catch (Exception $e) {
            Log::warning('MongoDB fallback search failed: ' . $e->getMessage());
            return [];
        }
    }

}
