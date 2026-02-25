<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PatientTreatmentAct extends Model
{
    use HasFactory;
    protected $fillable = [
        'patient_treatment_id', 'dental_act_id', 'quantity', 'tarif_snapshot'
    ];

    public function dentalAct()
    {
        return $this->belongsTo(DentalAct::class);
    }

    public function patientTreatment()
    {
        return $this->belongsTo(PatientTreatment::class);
    }
}
