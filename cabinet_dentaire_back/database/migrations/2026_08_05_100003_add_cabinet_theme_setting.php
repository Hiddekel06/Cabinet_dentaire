<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

return new class extends Migration
{
    public function up(): void
    {
        $now = Carbon::now();

        DB::table('settings')->updateOrInsert(
            ['key' => 'cabinet_theme'],
            [
                'value' => 'default',
                'type' => 'string',
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'cabinet_theme')->delete();
    }
};
