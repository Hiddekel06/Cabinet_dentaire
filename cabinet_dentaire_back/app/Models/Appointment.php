<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'dentist_id',
        'appointment_date',
        'appointment_time_specified',
        'duration',
        'status',
        'reason',
        'notes',
    ];

    protected $casts = [
        'appointment_date' => 'datetime',
        'appointment_time_specified' => 'boolean',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function dentist()
    {
        return $this->belongsTo(User::class, 'dentist_id');
    }

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class);
    }
}
