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
        Schema::create('session_receipts', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('medical_record_id')->unique();
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('patient_treatment_id')->nullable();
            $table->string('receipt_number', 30)->unique();
            $table->date('issue_date');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->timestamps();

            $table->foreign('medical_record_id')->references('id')->on('medical_records')->onDelete('cascade');
            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
            $table->foreign('patient_treatment_id')->references('id')->on('patient_treatments')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('session_receipts');
    }
};
