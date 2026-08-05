<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 100)->primary();
            $table->text('value')->nullable();
            $table->string('type', 30)->default('string');
            $table->timestamps();
        });

        // Pré-remplir avec les valeurs actuelles du client (fallback garanti)
        DB::table('settings')->insert([
            [
                'key'        => 'cabinet_name',
                'value'      => config('app.cabinet_name', 'Matlabul Shifah'),
                'type'       => 'string',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key'        => 'cabinet_address',
                'value'      => config('app.cabinet_address', "Cité Fadia , Guentaba n'23, Dakar"),
                'type'       => 'string',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key'        => 'cabinet_phone',
                'value'      => config('app.cabinet_phone', '+221 77 721 98 33'),
                'type'       => 'string',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key'        => 'cabinet_logo',
                'value'      => null,
                'type'       => 'image_path',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key'        => 'pdf_header_text',
                'value'      => null,
                'type'       => 'string',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
