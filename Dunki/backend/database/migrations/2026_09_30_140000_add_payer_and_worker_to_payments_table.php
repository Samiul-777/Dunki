<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('payer_id')->nullable()->after('agency_id')->constrained('users')->nullOnDelete();
            $table->foreignId('recipient_worker_id')->nullable()->after('payer_id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recipient_worker_id');
            $table->dropConstrainedForeignId('payer_id');
        });
    }
};
