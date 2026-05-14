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
        Schema::table('session_receipts', function (Blueprint $table) {
            // 1. Drop foreign key first (essential for MySQL)
            $table->dropForeign(['medical_record_id']);
            
            // 2. Drop unique constraint
            $table->dropUnique(['medical_record_id']);
            
            // 3. Add notes field
            $table->string('notes', 500)->nullable()->after('receipt_number');
            
            // 4. Make medical_record_id nullable
            $table->unsignedBigInteger('medical_record_id')->nullable()->change();

            // 5. Re-add foreign key without unique constraint
            $table->foreign('medical_record_id')->references('id')->on('medical_records')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('session_receipts', function (Blueprint $table) {
            $table->dropForeign(['medical_record_id']);
            $table->unique('medical_record_id');
            $table->dropColumn('notes');
            $table->unsignedBigInteger('medical_record_id')->nullable(false)->change();
            $table->foreign('medical_record_id')->references('id')->on('medical_records')->onDelete('cascade');
        });
    }
};
