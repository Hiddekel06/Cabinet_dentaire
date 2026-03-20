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
        Schema::table('patients', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->change();

            $table->string('contact_first_name', 255)->nullable()->after('phone');
            $table->string('contact_last_name', 255)->nullable()->after('contact_first_name');
            $table->string('contact_phone', 20)->nullable()->after('contact_last_name');
            $table->string('contact_relationship', 50)->nullable()->after('contact_phone');
            $table->boolean('contact_is_patient')->default(false)->after('contact_relationship');
            $table->unsignedBigInteger('contact_patient_id')->nullable()->after('contact_is_patient');

            $table->foreign('contact_patient_id')
                ->references('id')
                ->on('patients')
                ->nullOnDelete();

            $table->index('contact_phone');
            $table->index('contact_patient_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropIndex(['contact_phone']);
            $table->dropIndex(['contact_patient_id']);
            $table->dropForeign(['contact_patient_id']);

            $table->dropColumn([
                'contact_first_name',
                'contact_last_name',
                'contact_phone',
                'contact_relationship',
                'contact_is_patient',
                'contact_patient_id',
            ]);

            $table->string('phone', 20)->nullable(false)->change();
        });
    }
};
