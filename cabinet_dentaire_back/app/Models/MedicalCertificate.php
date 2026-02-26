<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicalCertificate extends Model
{
    protected $fillable = [
        'patient_id',
        'issued_by',
        'issue_date',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function issuer()
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}
