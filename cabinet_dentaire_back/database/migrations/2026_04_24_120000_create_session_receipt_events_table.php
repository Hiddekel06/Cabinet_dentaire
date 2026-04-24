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
        Schema::create('session_receipt_events', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('session_receipt_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('event_type', 30);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('session_receipt_id')->references('id')->on('session_receipts')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');

            $table->index(['session_receipt_id', 'event_type']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('session_receipt_events');
    }
};
