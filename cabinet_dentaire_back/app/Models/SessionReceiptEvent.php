<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SessionReceiptEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_receipt_id',
        'user_id',
        'event_type',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function sessionReceipt()
    {
        return $this->belongsTo(SessionReceipt::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
