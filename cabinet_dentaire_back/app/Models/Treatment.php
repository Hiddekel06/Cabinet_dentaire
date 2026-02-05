<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Treatment extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'price',
        'duration',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'duration' => 'integer',
    ];

    /**
     * Un traitement peut être appliqué à plusieurs patients
     */
    public function patientTreatments()
    {
        return $this->hasMany(PatientTreatment::class);
    }

    /**
     * Un traitement peut apparaître dans plusieurs lignes de facture
     */
    public function invoiceItems()
    {
        return $this->hasMany(InvoiceItem::class);
    }
}
