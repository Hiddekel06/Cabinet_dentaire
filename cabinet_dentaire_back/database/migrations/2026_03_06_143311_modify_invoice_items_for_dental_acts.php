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
        Schema::table('invoice_items', function (Blueprint $table) {
            // Supprimer la foreign key et la colonne treatment_id
            $table->dropForeign(['treatment_id']);
            $table->dropColumn('treatment_id');
            
            // Ajouter la référence vers patient_treatment_act
            $table->unsignedBigInteger('patient_treatment_act_id')->after('invoice_id');
            $table->foreign('patient_treatment_act_id')
                  ->references('id')
                  ->on('patient_treatment_act')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            // Supprimer la nouvelle référence
            $table->dropForeign(['patient_treatment_act_id']);
            $table->dropColumn('patient_treatment_act_id');
            
            // Recréer l'ancienne colonne treatment_id
            $table->unsignedBigInteger('treatment_id')->after('invoice_id');
            $table->foreign('treatment_id')
                  ->references('id')
                  ->on('treatments')
                  ->onDelete('restrict');
        });
    }
};
