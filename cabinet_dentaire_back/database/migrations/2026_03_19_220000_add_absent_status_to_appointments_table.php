<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('pending','confirmed','completed','cancelled','absent') DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE appointments MODIFY COLUMN status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending'");
    }
};
