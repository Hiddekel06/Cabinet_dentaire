<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('patients', 'phone_normalized')) {
            Schema::table('patients', function (Blueprint $table) {
                $table->string('phone_normalized')->nullable()->after('phone')->index();
            });
        }

        // Migration des données existantes (utilisation de DB::table pour éviter les scopes de modèles comme SoftDeletes)
        DB::table('patients')->orderBy('id')->chunk(100, function ($patients) {
            foreach ($patients as $patient) {
                if (!empty($patient->phone)) {
                    $normalized = preg_replace('/\D/', '', $patient->phone);
                    DB::table('patients')
                        ->where('id', $patient->id)
                        ->update(['phone_normalized' => $normalized]);
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
