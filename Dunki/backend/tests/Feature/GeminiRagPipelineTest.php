<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\MongoVectorService;
use App\Services\RagAssistantService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

class GeminiRagPipelineTest extends TestCase
{
    private $originalGeminiKey;
    private $originalShareUserContext;

    protected function setUp(): void
    {
        parent::setUp();

        $this->originalGeminiKey = getenv('GEMINI_API_KEY');
        $this->originalShareUserContext = getenv('GEMINI_SHARE_USER_CONTEXT');
        putenv('GEMINI_API_KEY=test-gemini-key');
        $_ENV['GEMINI_API_KEY'] = 'test-gemini-key';
        $_SERVER['GEMINI_API_KEY'] = 'test-gemini-key';
        putenv('GEMINI_SHARE_USER_CONTEXT=false');
        $_ENV['GEMINI_SHARE_USER_CONTEXT'] = 'false';
        $_SERVER['GEMINI_SHARE_USER_CONTEXT'] = 'false';
        config([
            'services.gemini.api_key' => 'test-gemini-key',
            'services.gemini.generation_model' => 'gemini-3.8-flash',
            'services.gemini.share_user_context' => false,
            'services.mongodb.uri' => null,
            'services.mongodb.database' => 'dunki_db',
            'services.mongodb.collection' => 'dunki_knowledge_chunks',
            'services.mongodb.vector_index' => 'vector_index',
            'services.mongodb.embedding_model' => 'gemini-embedding-2-preview',
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->originalGeminiKey === false) {
            putenv('GEMINI_API_KEY');
            unset($_ENV['GEMINI_API_KEY'], $_SERVER['GEMINI_API_KEY']);
        } else {
            putenv('GEMINI_API_KEY=' . $this->originalGeminiKey);
            $_ENV['GEMINI_API_KEY'] = $this->originalGeminiKey;
            $_SERVER['GEMINI_API_KEY'] = $this->originalGeminiKey;
        }

        if ($this->originalShareUserContext === false) {
            putenv('GEMINI_SHARE_USER_CONTEXT');
            unset($_ENV['GEMINI_SHARE_USER_CONTEXT'], $_SERVER['GEMINI_SHARE_USER_CONTEXT']);
        } else {
            putenv('GEMINI_SHARE_USER_CONTEXT=' . $this->originalShareUserContext);
            $_ENV['GEMINI_SHARE_USER_CONTEXT'] = $this->originalShareUserContext;
            $_SERVER['GEMINI_SHARE_USER_CONTEXT'] = $this->originalShareUserContext;
        }

        parent::tearDown();
    }

    public function test_document_and_query_embeddings_use_matching_gemini_retrieval_format(): void
    {
        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'embedding' => ['values' => array_fill(0, 1536, 0.25)],
            ]),
        ]);

        $service = new MongoVectorService();
        $documentVector = $service->generateEmbedding('Verified recruitment process', false, 'Agency verification');
        $queryVector = $service->generateEmbedding('How can I verify an agency?', true);

        $this->assertCount(1536, $documentVector);
        $this->assertCount(1536, $queryVector);
        Http::assertSentCount(2);
        Http::assertSent(
            fn(Request $request) =>
                str_contains($request->url(), '/models/gemini-embedding-2-preview:embedContent')
                && !str_contains($request->url(), 'key=')
                && $request->hasHeader('x-goog-api-key', 'test-gemini-key')
                && $request->data()['outputDimensionality'] === 1536
                && $request->data()['content']['parts'][0]['text'] === 'title: Agency verification | text: Verified recruitment process'
        );
        Http::assertSent(
            fn(Request $request) =>
                $request->data()['content']['parts'][0]['text'] === 'task: question answering | query: How can I verify an agency?'
        );
    }

    public function test_failed_embedding_returns_null_instead_of_a_fake_vector(): void
    {
        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response(['error' => ['message' => 'quota']], 429),
        ]);

        $embedding = (new MongoVectorService())->generateEmbedding('A worker question');

        $this->assertNull($embedding);
    }

    public function test_rag_generation_uses_the_current_configured_flash_model(): void
    {
        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => 'Grounded answer']]]]],
            ]),
        ]);

        $vectorService = Mockery::mock(MongoVectorService::class);
        $vectorService->shouldReceive('isConfigured')->andReturn(false);

        $user = new User([
            'name' => 'Private Worker Name',
            'role' => 'worker',
            'tracking_id' => 'DNK-2026-123456',
            'destination' => 'Malaysia',
        ]);
        $result = (new RagAssistantService($vectorService))->answer('Explain the worker migration journey', $user);

        $this->assertSame('Grounded answer', $result['reply']);
        Http::assertSent(
            fn(Request $request) =>
                str_contains($request->url(), '/models/gemini-3.8-flash:generateContent')
                && !str_contains($request->url(), 'key=')
                && $request->hasHeader('x-goog-api-key', 'test-gemini-key')
                && !str_contains($request->data()['systemInstruction']['parts'][0]['text'], 'Private Worker Name')
                && !str_contains($request->data()['systemInstruction']['parts'][0]['text'], 'DNK-2026-123456')
                && str_contains($request->data()['systemInstruction']['parts'][0]['text'], 'Never claim that Dunki')
        );
    }

    public function test_rag_generation_tries_later_flash_models_when_earlier_models_are_unavailable(): void
    {
        Http::fake(function (Request $request) {
            if (str_contains($request->url(), '/models/gemini-3.5-flash:generateContent')) {
                return Http::response([
                    'candidates' => [['content' => ['parts' => [['text' => 'Fallback model answer']]]]],
                ]);
            }

            return Http::response(['error' => ['status' => 'UNAVAILABLE']], 503);
        });

        $vectorService = Mockery::mock(MongoVectorService::class);
        $vectorService->shouldReceive('isConfigured')->andReturn(false);

        $result = (new RagAssistantService($vectorService))->answer('Explain the worker migration journey');

        $this->assertSame('Fallback model answer', $result['reply']);
        Http::assertSentCount(4);
    }

    public function test_gemini_failure_diagnostic_is_available_to_admins_only(): void
    {
        config(['app.debug' => false]);
        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'error' => ['status' => 'UNAVAILABLE'],
            ], 503),
        ]);

        $vectorService = Mockery::mock(MongoVectorService::class);
        $vectorService->shouldReceive('isConfigured')->andReturn(false);
        $service = new RagAssistantService($vectorService);

        $admin = new User(['name' => 'Admin', 'role' => 'admin']);
        $adminResult = $service->answer('Explain payment records', $admin);

        $this->assertSame(503, $adminResult['diagnostic']['status']);
        $this->assertSame('GEMINI_HTTP_503', $adminResult['diagnostic']['code']);
        $this->assertArrayNotHasKey('diagnostic', $service->answer('Explain payment records'));
    }

    public function test_rag_profile_context_uses_the_normalized_destination_when_sharing_is_enabled(): void
    {
        putenv('GEMINI_SHARE_USER_CONTEXT=true');
        $_ENV['GEMINI_SHARE_USER_CONTEXT'] = 'true';
        $_SERVER['GEMINI_SHARE_USER_CONTEXT'] = 'true';
        config(['services.gemini.share_user_context' => true]);

        Http::fake([
            'https://generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => 'Profile answer']]]]],
            ]),
        ]);

        $vectorService = Mockery::mock(MongoVectorService::class);
        $vectorService->shouldReceive('isConfigured')->andReturn(false);
        $user = new User([
            'name' => 'Profile User',
            'role' => 'nominee',
            'destination' => 'Riyadh, Saudi Arabia',
        ]);

        (new RagAssistantService($vectorService))->answer('What destination is saved?', $user);

        Http::assertSent(
            fn(Request $request) =>
                str_contains($request->data()['systemInstruction']['parts'][0]['text'], 'Destination Country: Saudi Arabia')
        );
    }
}
