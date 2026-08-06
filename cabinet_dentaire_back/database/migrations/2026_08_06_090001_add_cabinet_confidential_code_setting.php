<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = Carbon::now();

        DB::table('settings')->updateOrInsert(
            ['key' => 'cabinet_confidential_code'],
            [
                'value' => '1990',
                'type' => 'string',
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'cabinet_confidential_code')->delete();
    }
};
