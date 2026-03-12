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
        Schema::table('invoices', function (Blueprint $table) {
            $table->index(['issue_date', 'status'], 'idx_invoices_issue_status');
            $table->index('issue_date', 'idx_invoices_issue_date');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->index('purchase_date', 'idx_products_purchase_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex('idx_invoices_issue_status');
            $table->dropIndex('idx_invoices_issue_date');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_purchase_date');
        });
    }
};
