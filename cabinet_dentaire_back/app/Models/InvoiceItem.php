<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'patient_treatment_act_id',
        'dent',
        'treatment_name',
        'indice',
        'quantity',
        'unit_price',
        'subtotal',
    ];

    protected $casts = [
        'dent' => 'integer',
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function patientTreatmentAct()
    {
        return $this->belongsTo(PatientTreatmentAct::class);
    }
}
