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
            // On rend l'ancienne colonne optionnelle pour ne pas casser l'historique
            $table->unsignedBigInteger('patient_treatment_act_id')->nullable()->change();
            
            // Nouvelles colonnes pour le modèle "Care Summary"
            $table->integer('dent')->nullable()->after('invoice_id');
            $table->string('treatment_name')->nullable()->after('dent');
            $table->string('indice')->nullable()->after('treatment_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropColumn(['dent', 'treatment_name', 'indice']);
            $table->unsignedBigInteger('patient_treatment_act_id')->nullable(false)->change();
        });
    }
};
