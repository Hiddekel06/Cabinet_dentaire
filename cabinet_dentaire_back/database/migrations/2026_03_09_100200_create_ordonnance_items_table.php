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
        Schema::create('ordonnance_items', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('ordonnance_id');
            $table->unsignedBigInteger('medication_id')->nullable();
            $table->string('medication_name', 150);
            $table->string('frequency', 100);
            $table->string('duration', 100)->nullable();
            $table->text('instructions')->nullable();
            $table->timestamps();

            $table->foreign('ordonnance_id')->references('id')->on('ordonnances')->onDelete('cascade');
            $table->foreign('medication_id')->references('id')->on('medications')->onDelete('set null');

            $table->index('ordonnance_id');
            $table->index('medication_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ordonnance_items');
    }
};
