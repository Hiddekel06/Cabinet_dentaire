<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PatientTreatment extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'treatment_id',
        'start_date',
        'end_date',
        'status',
        'total_sessions',
        'completed_sessions',
        'notes',
        'next_appointment_id',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'total_sessions' => 'integer',
        'completed_sessions' => 'integer',
    ];

    /**
     * Le traitement patient appartient à un patient
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    /**
     * Le traitement patient référence un traitement du catalogue
     */
    public function treatment()
    {
        return $this->belongsTo(Treatment::class);
    }

    /**
     * Prochain rendez-vous associé au suivi
     */
    public function nextAppointment()
    {
        return $this->belongsTo(Appointment::class, 'next_appointment_id');
    }

    /**
     * Un traitement patient peut avoir plusieurs dossiers médicaux (sessions)
     */
    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class);
    }
}
