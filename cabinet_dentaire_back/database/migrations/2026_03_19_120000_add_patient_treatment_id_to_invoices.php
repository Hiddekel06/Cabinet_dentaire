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
        Schema::table('invoices', function (Blueprint $table) {
            // Ajouter la colonne patient_treatment_id (nullable pour permettre migration progressive)
            $table->unsignedBigInteger('patient_treatment_id')->nullable()->after('patient_id');
            
            // Index unique: chaque traitement ne peut avoir qu'une facture
            $table->unique('patient_treatment_id');
            
            // Contrainte FK
            $table->foreign('patient_treatment_id')
                ->references('id')
                ->on('patient_treatments')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique(['patient_treatment_id']);
            $table->dropForeign(['patient_treatment_id']);
            $table->dropColumn('patient_treatment_id');
        });
    }
};
