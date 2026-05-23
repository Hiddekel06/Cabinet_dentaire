<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Patient;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('phone_normalized')->nullable()->after('phone')->index();
        });

        // Migration des données existantes (par paquets de 100 pour la performance)
        Patient::chunk(100, function ($patients) {
            foreach ($patients as $patient) {
                if ($patient->phone) {
                    $patient->phone_normalized = preg_replace('/\D/', '', $patient->phone);
                    $patient->save();
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn('phone_normalized');
        });
    }
};
