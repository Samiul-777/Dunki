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
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_id')->unique(); // e.g. CMP-2026-004821
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('against_agency');
            $table->string('category'); // Overcharging / Illegal Fees, Fake Visa / False Promise, Contract Substitution, Passport / Document Withholding, Physical Abuse / Harassment, Delayed Deployment, Unpaid Wages Abroad, Other
            $table->string('subject');
            $table->text('description');
            $table->string('evidence_path')->nullable();
            $table->string('priority')->default('medium'); // low, medium, high, urgent
            $table->string('status')->default('submitted'); // submitted, under_review, investigating, escalated_to_bmet, resolved, dismissed
            $table->text('resolution_notes')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
