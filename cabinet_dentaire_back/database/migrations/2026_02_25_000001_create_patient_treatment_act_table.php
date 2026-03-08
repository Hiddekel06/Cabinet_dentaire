<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('patient_treatment_acts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('patient_treatment_id');
            $table->unsignedBigInteger('dental_act_id');
            $table->integer('quantity')->default(1);
            $table->integer('tarif_snapshot'); // Tarif au moment de l'acte
            $table->timestamps();

            $table->foreign('patient_treatment_id')->references('id')->on('patient_treatments')->onDelete('cascade');
            $table->foreign('dental_act_id')->references('id')->on('dental_acts')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('patient_treatment_acts');
    }
};
