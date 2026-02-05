<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedicalRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'appointment_id',
        'patient_treatment_id',
        'treatment_description',
        'diagnosis',
        'observations',
        'created_by',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Le dossier médical appartient à un patient
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Le dossier peut être lié à un rendez-vous
     */
    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    /**
     * Le dossier peut être lié à un traitement patient
     */
    public function patientTreatment()
    {
        return $this->belongsTo(PatientTreatment::class);
    }

    /**
     * Le dossier est créé par un utilisateur (dentiste)
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
