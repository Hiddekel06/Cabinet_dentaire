<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Patient extends Model
{
    use HasFactory;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'contact_first_name',
        'contact_last_name',
        'contact_phone',
        'contact_relationship',
        'contact_is_patient',
        'contact_patient_id',
        'date_of_birth',
        'gender',
        'address',
        'city',
        'notes',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class);
    }

    public function patientTreatments()
    {
        return $this->hasMany(PatientTreatment::class);
    }

    public function radiographies()
    {
        return $this->hasMany(Radiography::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function medicalCertificates()
    {
        return $this->hasMany(MedicalCertificate::class);
    }
}
