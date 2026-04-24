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
        if (!Schema::hasColumn('patients', 'general_state')) {
            Schema::table('patients', function (Blueprint $table) {
                $table->text('general_state')->nullable()->after('notes');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('patients', 'general_state')) {
            Schema::table('patients', function (Blueprint $table) {
                $table->dropColumn('general_state');
            });
        }
    }
};