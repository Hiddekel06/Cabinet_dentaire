<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->boolean('appointment_time_specified')->default(true)->after('appointment_date');
        });

        // Legacy backfill: les rendez-vous stockés à minuit sont considérés comme "heure non précisée".
        DB::statement("UPDATE appointments SET appointment_time_specified = 0 WHERE TIME(appointment_date) = '00:00:00'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('appointment_time_specified');
        });
    }
};
