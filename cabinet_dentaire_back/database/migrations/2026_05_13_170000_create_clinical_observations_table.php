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
        Schema::create('clinical_observations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('created_by'); // Le médecin qui fait l'observation
            $table->date('date');
            
            // 1. Motif & Histoire
            $table->text('reason_for_consultation')->nullable();
            $table->text('history_of_illness')->nullable();
            
            // 2. ATCD (Antécédents)
            $table->text('atcd_personal_med')->nullable();
            $table->text('atcd_personal_chir')->nullable();
            $table->text('atcd_family_med')->nullable();
            $table->text('atcd_family_chir')->nullable();
            
            // 3. Clinique - Signes Généraux & Constantes
            $table->string('consciousness')->nullable();
            $table->string('mucous_membranes')->nullable();
            $table->string('blood_pressure')->nullable(); // TA (ex: 12/8)
            $table->integer('pulse')->nullable();
            $table->float('temperature')->nullable();
            $table->string('blood_sugar')->nullable(); // Dextro
            $table->float('weight')->nullable();
            $table->string('skin_fold_major')->nullable();
            $table->string('skin_fold_minor')->nullable();
            $table->string('lower_limb_edema')->nullable(); // OMI
            $table->string('calves')->nullable();
            
            // 4. Examen Physique (Par appareil)
            $table->text('physical_exam_cardio')->nullable();
            $table->text('physical_exam_pulmonary')->nullable();
            $table->text('physical_exam_neurological')->nullable();
            $table->text('physical_exam_locomotor')->nullable();
            $table->text('physical_exam_digestive')->nullable();
            $table->text('physical_exam_others')->nullable();
            
            // 5. Synthèse & Diagnostic
            $table->text('syndromic_summary')->nullable();
            $table->text('diagnostic_hypotheses')->nullable();
            $table->text('emergency_management')->nullable(); // CAT d'urgence
            $table->text('positive_diagnostic')->nullable();
            
            // 6. Examens demandés
            $table->text('tests_biology')->nullable();
            $table->text('tests_imaging')->nullable(); // Echographie, Radio, Scanner
            
            // 7. Plan de soins
            $table->text('treatments')->nullable();
            $table->text('follow_up')->nullable(); // Suivi
            
            $table->timestamps();

            // Index et Clés étrangères
            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users');
            $table->index('date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinical_observations');
    }
};
