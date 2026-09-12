<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('worker');
            $table->string('phone')->unique()->nullable();
            $table->string('tracking_id')->unique()->nullable();
            $table->string('destination')->nullable();
            $table->string('agency')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'phone', 'tracking_id', 'destination', 'agency']);
        });
    }
};