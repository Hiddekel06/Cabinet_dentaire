<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DentalAct extends Model
{
    use HasFactory;
    protected $fillable = [
        'name', 'category', 'code', 'tarif', 'description'
    ];

    public function patientTreatmentActs()
    {
        return $this->hasMany(PatientTreatmentAct::class);
    }
}
