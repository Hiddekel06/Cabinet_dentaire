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
        Schema::table('session_receipts', function (Blueprint $table) {
            $table->enum('status', ['pending', 'paid'])->default('pending')->after('total_amount');
            $table->dateTime('paid_at')->nullable()->after('status');

            $table->index('status');
            $table->index('paid_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('session_receipts', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['paid_at']);
            $table->dropColumn(['status', 'paid_at']);
        });
    }
};