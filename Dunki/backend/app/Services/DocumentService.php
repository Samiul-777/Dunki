<?php

namespace App\Services;

use App\Models\Document;
use App\Models\User;

class DocumentService
{
    /**
     * Get all documents for the user.
     */
    public function getUserDocuments(User $user)
    {
        if ($user->verification_document_path && $user->documents()->where('type', 'verification')->doesntExist()) {
            $docType = $user->role === 'agency' ? 'Official Agency License' : 'Registration Identity Verification';
            $user->documents()->create([
                'name' => $docType,
                'status' => $user->verification_status === 'verified' ? 'complete' : 'missing',
                'file_path' => $user->verification_document_path,
                'type' => 'verification',
            ]);
        }

        return $user->documents()->latest()->get();
    }

    /**
     * Create a new document for the user.
     */
    public function createDocument(User $user, array $data): Document
    {
        return $user->documents()->create($data);
    }

    /**
     * Update an existing document.
     */
    public function updateDocument(Document $document, array $data): Document
    {
        $document->update($data);
        return $document;
    }

    /**
     * Delete an existing document.
     */
    public function deleteDocument(Document $document): void
    {
        $document->delete();
    }
}
