<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SessionReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'medical_record_id',
        'patient_id',
        'patient_treatment_id',
        'receipt_number',
        'issue_date',
        'total_amount',
        'status',
        'paid_at',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'paid_at' => 'datetime',
        'total_amount' => 'decimal:2',
    ];

    public function medicalRecord()
    {
        return $this->belongsTo(MedicalRecord::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function patientTreatment()
    {
        return $this->belongsTo(PatientTreatment::class);
    }

    public function items()
    {
        return $this->hasMany(SessionReceiptItem::class);
    }

    public function events()
    {
        return $this->hasMany(SessionReceiptEvent::class);
    }
}
