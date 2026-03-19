<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PatientTreatment extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'name',
        'start_date',
        'end_date',
        'status',
        'notes',
        'next_appointment_id',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    /**
     * Le traitement patient appartient à un patient
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class);
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

    /**
     * Les actes associés à ce traitement patient
     */
    public function acts()
    {
        return $this->hasMany(PatientTreatmentAct::class);
    }

    /**
     * La facture cumulative associée à ce traitement (1:1)
     */
    public function invoice()
    {
        return $this->hasOne(Invoice::class);
    }
}
