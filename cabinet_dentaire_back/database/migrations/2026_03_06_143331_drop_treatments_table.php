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
        // Supprimer la table treatments (obsolète)
        Schema::dropIfExists('treatments');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recréer la table treatments (si rollback nécessaire)
        Schema::create('treatments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('base_price', 10, 2);
            $table->decimal('vat_percentage', 5, 2)->default(0);
            $table->timestamps();
        });
    }
};
