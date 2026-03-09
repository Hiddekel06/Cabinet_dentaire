<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrdonnanceItem extends Model
{
    protected $fillable = [
        'ordonnance_id',
        'medication_id',
        'medication_name',
        'frequency',
        'duration',
        'instructions',
    ];

    public function ordonnance()
    {
        return $this->belongsTo(Ordonnance::class);
    }

    public function medication()
    {
        return $this->belongsTo(Medication::class);
    }
}
