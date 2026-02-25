<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('dental_acts', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Nom de l'acte
            $table->string('category'); // Catégorie
            $table->string('code'); // Cotation (D5, D10...)
            $table->integer('tarif'); // Tarif en FCFA
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('dental_acts');
    }
};
