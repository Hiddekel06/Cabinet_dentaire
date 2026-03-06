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
            // Ajouter la colonne 'name' pour identifier le suivi
            $table->string('name', 255)->nullable()->after('patient_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patient_treatments', function (Blueprint $table) {
            $table->dropColumn('name');
        });
    }
};
