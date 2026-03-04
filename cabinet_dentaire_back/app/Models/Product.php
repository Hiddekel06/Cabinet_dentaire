<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'type_id',
        'name',
        'quantity',
        'unit_price',
        'total_amount',
        'purchase_date',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'purchase_date' => 'date',
    ];

    public function type()
    {
        return $this->belongsTo(ProductType::class, 'type_id');
    }
}
