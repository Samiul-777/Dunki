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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('agency_name')->nullable();
            $table->string('purpose'); // e.g. Agency processing fee, Medical test fee, Training fee, Visa fee, Air ticket, Govt welfare fund
            $table->decimal('amount', 12, 2);
            $table->string('currency', 10)->default('BDT');
            $table->string('payment_method'); // e.g. bKash, Nagad, Bank transfer, Cash receipt, Rocket
            $table->string('transaction_id')->nullable();
            $table->string('receipt_path')->nullable();
            $table->string('status')->default('completed'); // completed, pending, verified, disputed
            $table->date('payment_date');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
