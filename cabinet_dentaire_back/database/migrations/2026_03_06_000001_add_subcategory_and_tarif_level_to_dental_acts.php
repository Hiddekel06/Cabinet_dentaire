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
        Schema::table('dental_acts', function (Blueprint $table) {
            $table->string('subcategory', 100)->nullable()->after('category');
            $table->string('tarif_level', 50)->nullable()->after('subcategory');
            
            // Rendre code unique
            $table->unique('code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dental_acts', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropColumn(['subcategory', 'tarif_level']);
        });
    }
};
