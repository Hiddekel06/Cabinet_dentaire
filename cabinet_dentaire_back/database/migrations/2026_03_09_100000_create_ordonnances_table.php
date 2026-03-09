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
        Schema::create('ordonnances', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('issued_by');
            $table->date('issue_date');
            $table->unsignedBigInteger('medical_record_id')->nullable();
            $table->unsignedBigInteger('patient_treatment_id')->nullable();
            $table->text('notes')->nullable();
            $table->string('file_path', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('patient_id')->references('id')->on('patients')->onDelete('cascade');
            $table->foreign('issued_by')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('medical_record_id')->references('id')->on('medical_records')->onDelete('set null');
            $table->foreign('patient_treatment_id')->references('id')->on('patient_treatments')->onDelete('set null');

            $table->index('patient_id');
            $table->index('issue_date');
            $table->index('issued_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ordonnances');
    }
};
