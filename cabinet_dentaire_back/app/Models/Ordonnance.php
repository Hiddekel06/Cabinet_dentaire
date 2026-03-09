<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ordonnance extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'patient_id',
        'issued_by',
        'issue_date',
        'medical_record_id',
        'patient_treatment_id',
        'notes',
        'file_path',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function issuer()
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function medicalRecord()
    {
        return $this->belongsTo(MedicalRecord::class);
    }

    public function patientTreatment()
    {
        return $this->belongsTo(PatientTreatment::class);
    }

    public function items()
    {
        return $this->hasMany(OrdonnanceItem::class);
    }
}
