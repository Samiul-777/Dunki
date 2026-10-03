<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Services\DocumentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function __construct(
        protected DocumentService $documentService
    ) {
    }

    // READ — all documents belonging to the logged-in user
    public function index(Request $request)
    {
        return response()->json(
            $this->documentService->getUserDocuments($request->user())
        );
    }

    // READ — one document
    public function show(Request $request, Document $document)
    {
        if ($document->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($document);
    }

    public function file(Request $request, Document $document)
    {
        if ($document->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$document->file_path || !Storage::disk('public')->exists($document->file_path)) {
            return response()->json(['message' => 'Document file not found.'], 404);
        }

        return response()->file(Storage::disk('public')->path($document->file_path));
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
        if ($document->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:missing,complete',
        ]);

        $document = $this->documentService->updateDocument($document, $data);

        return response()->json($document);
    }

    // DELETE
    public function destroy(Request $request, Document $document)
    {
        if ($document->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $this->documentService->deleteDocument($document);

        return response()->json(['message' => 'Document deleted']);
    }
}
