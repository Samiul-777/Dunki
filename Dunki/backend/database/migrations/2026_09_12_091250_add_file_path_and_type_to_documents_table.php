<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('file_path')->nullable()->after('status');
            $table->string('type')->default('custom')->after('file_path');
        });

        // Backfill existing users with verification documents
        $users = \App\Models\User::whereNotNull('verification_document_path')->get();
        foreach ($users as $user) {
            $docType = $user->role === 'agency' ? 'Official Agency License' : 'Registration Identity Verification';
            \App\Models\Document::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'type' => 'verification',
                ],
                [
                    'name' => $docType,
                    'status' => $user->verification_status === 'verified' ? 'complete' : 'missing',
                    'file_path' => $user->verification_document_path,
                ]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['file_path', 'type']);
        });
    }
};
