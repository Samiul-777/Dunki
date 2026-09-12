<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Services\DocumentService;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    public function __construct(
        protected DocumentService $documentService
    ) {}

    // READ — all documents belonging to the logged-in user
    public function index(Request $request)
    {
        return response()->json(
            $this->documentService->getUserDocuments($request->user())
        );
    }

    // READ — one document
    public function show(Document $document)
    {
        return response()->json($document);
    }

    // CREATE
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'status' => 'nullable|in:missing,complete',
            'file' => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
        ]);

        if ($request->hasFile('file')) {
            $data['file_path'] = $request->file('file')->store('documents', 'public');
            $data['status'] = $data['status'] ?? 'complete';
        }

        unset($data['file']);

        $document = $this->documentService->createDocument($request->user(), $data);

        return response()->json($document, 201);
    }

    // UPDATE
    public function update(Request $request, Document $document)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:missing,complete',
        ]);

        $document = $this->documentService->updateDocument($document, $data);

        return response()->json($document);
    }

    // DELETE
    public function destroy(Document $document)
    {
        $this->documentService->deleteDocument($document);

        return response()->json(['message' => 'Document deleted']);
    }
}
