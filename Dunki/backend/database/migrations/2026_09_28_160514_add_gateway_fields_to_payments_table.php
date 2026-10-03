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
        Schema::table('payments', function (Blueprint $table) {
            $table->string('card_type')->nullable()->after('payment_method');
            $table->string('val_id')->nullable()->after('transaction_id');
            $table->string('bank_tran_id')->nullable()->after('val_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['card_type', 'val_id', 'bank_tran_id']);
        });
    }
};
