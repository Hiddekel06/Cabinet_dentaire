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
        Schema::table('medical_certificates', function (Blueprint $table) {
            $table->string('consultation_time', 5)->nullable()->after('issue_date');
            $table->unsignedSmallInteger('rest_days')->nullable()->after('consultation_time');
            $table->date('rest_start_date')->nullable()->after('rest_days');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('medical_certificates', function (Blueprint $table) {
            $table->dropColumn(['consultation_time', 'rest_days', 'rest_start_date']);
        });
    }
};