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
        // Index sur patients pour le tri et filtrage
        Schema::table('patients', function (Blueprint $table) {
            if (!Schema::hasIndex('patients', 'idx_patients_name')) {
                $table->index(['last_name', 'first_name'], 'idx_patients_name');
            }
            if (!Schema::hasIndex('patients', 'idx_patients_created')) {
                $table->index('created_at', 'idx_patients_created');
            }
        });

        // Index sur appointments pour le tri et filtrage
        Schema::table('appointments', function (Blueprint $table) {
            if (!Schema::hasIndex('appointments', 'idx_appt_date')) {
                $table->index('appointment_date', 'idx_appt_date');
            }
            if (!Schema::hasIndex('appointments', 'idx_appt_patient')) {
                $table->index('patient_id', 'idx_appt_patient');
            }
            if (!Schema::hasIndex('appointments', 'idx_appt_dentist')) {
                $table->index('dentist_id', 'idx_appt_dentist');
            }
        });

        // Index sur patient_treatments
        Schema::table('patient_treatments', function (Blueprint $table) {
            if (!Schema::hasIndex('patient_treatments', 'idx_pt_patient')) {
                $table->index('patient_id', 'idx_pt_patient');
            }
            if (!Schema::hasIndex('patient_treatments', 'idx_pt_treatment')) {
                $table->index('treatment_id', 'idx_pt_treatment');
            }
            if (!Schema::hasIndex('patient_treatments', 'idx_pt_status')) {
                $table->index('status', 'idx_pt_status');
            }
            if (!Schema::hasIndex('patient_treatments', 'idx_pt_created')) {
                $table->index('created_at', 'idx_pt_created');
            }
        });

        // Index sur medical_records
        Schema::table('medical_records', function (Blueprint $table) {
            if (!Schema::hasIndex('medical_records', 'idx_mr_patient')) {
                $table->index('patient_id', 'idx_mr_patient');
            }
            if (!Schema::hasIndex('medical_records', 'idx_mr_date')) {
                $table->index('date', 'idx_mr_date');
            }
        });

        // Index sur treatments
        Schema::table('treatments', function (Blueprint $table) {
            if (!Schema::hasIndex('treatments', 'idx_treatment_name')) {
                $table->index('name', 'idx_treatment_name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropIndexIfExists(['idx_patients_name', 'idx_patients_created']);
        });
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndexIfExists(['idx_appt_date', 'idx_appt_patient', 'idx_appt_dentist']);
        });
        Schema::table('patient_treatments', function (Blueprint $table) {
            $table->dropIndexIfExists(['idx_pt_patient', 'idx_pt_treatment', 'idx_pt_status', 'idx_pt_created']);
        });
        Schema::table('medical_records', function (Blueprint $table) {
            $table->dropIndexIfExists(['idx_mr_patient', 'idx_mr_date']);
        });
        Schema::table('treatments', function (Blueprint $table) {
            $table->dropIndexIfExists(['idx_treatment_name']);
        });
    }
};
