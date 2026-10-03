<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentFileAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_open_a_document_file(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('documents/owner.pdf', 'test document');
        $owner = User::factory()->create();
        $document = $this->createDocument($owner, 'documents/owner.pdf');

        $this->actingAs($owner, 'sanctum')
            ->get("/api/documents/{$document->id}/file")
            ->assertOk();
    }

    public function test_other_users_cannot_open_or_read_a_document(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('documents/private.pdf', 'private document');
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $document = $this->createDocument($owner, 'documents/private.pdf');

        $this->actingAs($otherUser, 'sanctum')
            ->getJson("/api/documents/{$document->id}/file")
            ->assertForbidden();

        $this->getJson("/api/documents/{$document->id}")->assertForbidden();
    }

    private function createDocument(User $owner, string $filePath): Document
    {
        return Document::create([
            'user_id' => $owner->id,
            'name' => 'Identity document',
            'status' => 'complete',
            'file_path' => $filePath,
            'type' => 'custom',
        ]);
    }
}
