<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Agrrandir la colonne role sans détruire la table ni les données
        try {
            DB::statement("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'admin'");
        } catch (\Throwable $e) {
            // Ignorer si déjà fait
        }
    }

    public function down(): void
    {
        // Ne rien faire pour préserver la sécurité des données
    }
};
