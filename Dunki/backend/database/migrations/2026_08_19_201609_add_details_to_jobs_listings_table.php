<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('jobs_listings', function (Blueprint $table) {
            $table->text('description')->nullable()->after('title');
            $table->text('criteria')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('jobs_listings', function (Blueprint $table) {
            $table->dropColumn(['description', 'criteria']);
        });
    }
};
