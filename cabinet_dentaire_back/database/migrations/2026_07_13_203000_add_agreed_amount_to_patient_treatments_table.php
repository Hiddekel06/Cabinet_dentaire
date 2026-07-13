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
            $table->decimal('agreed_amount', 15, 2)->nullable()->after('notes');
            $table->date('agreed_amount_date')->nullable()->after('agreed_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patient_treatments', function (Blueprint $table) {
            $table->dropColumn(['agreed_amount', 'agreed_amount_date']);
        });
    }
};
