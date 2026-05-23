<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Appointment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'patient_id',
        'dentist_id',
        'assigned_doctor_id',
        'appointment_date',
        'appointment_time_specified',
        'duration',
        'reason',
        'status',
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

    public function assignedDoctor()
    {
        return $this->belongsTo(User::class, 'assigned_doctor_id');
    }

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class);
    }
}
