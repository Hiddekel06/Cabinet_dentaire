<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SessionReceiptItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_receipt_id',
        'dental_act_id',
        'quantity',
        'unit_price',
        'line_total',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    public function sessionReceipt()
    {
        return $this->belongsTo(SessionReceipt::class);
    }

    public function dentalAct()
    {
        return $this->belongsTo(DentalAct::class);
    }
}
