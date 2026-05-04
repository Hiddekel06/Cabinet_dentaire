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
        if (!Schema::hasColumn('medical_records', 'amount_collected')) {
            Schema::table('medical_records', function (Blueprint $table) {
                $table->decimal('amount_collected', 10, 2)->nullable()->default(null)->after('appointment_notes');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('medical_records', 'amount_collected')) {
            Schema::table('medical_records', function (Blueprint $table) {
                $table->dropColumn('amount_collected');
            });
        }
    }
};
