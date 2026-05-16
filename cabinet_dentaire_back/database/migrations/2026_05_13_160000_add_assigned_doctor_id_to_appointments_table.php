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
        Schema::table('appointments', function (Blueprint $table) {
            // Field to assign the appointment to a specific doctor
            // If null, it could mean 'any doctor' or it uses the legacy dentist_id
            $table->unsignedBigInteger('assigned_doctor_id')->nullable()->after('dentist_id');
            
            // Re-linking for foreign key safety
            $table->foreign('assigned_doctor_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['assigned_doctor_id']);
            $table->dropColumn('assigned_doctor_id');
        });
    }
};
