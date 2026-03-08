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
        Schema::table('patient_treatments', function (Blueprint $table) {
            // Supprimer la foreign key d'abord
            $table->dropForeign(['treatment_id']);
            
            // Supprimer les colonnes obsolètes
            $table->dropColumn(['treatment_id', 'total_sessions', 'completed_sessions']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patient_treatments', function (Blueprint $table) {
            // Recréer les colonnes
            $table->unsignedBigInteger('treatment_id')->after('patient_id');
            $table->integer('total_sessions')->nullable()->after('notes');
            $table->integer('completed_sessions')->default(0)->after('total_sessions');
            
            // Note: Ne pas recréer la foreign key car la table treatments 
            // pourrait avoir été supprimée par une migration ultérieure
        });
    }
};
