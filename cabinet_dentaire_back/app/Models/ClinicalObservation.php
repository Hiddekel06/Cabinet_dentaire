<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClinicalObservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'created_by',
        'date',
        'reason_for_consultation',
        'history_of_illness',
        'atcd_personal_med',
        'atcd_personal_chir',
        'atcd_family_med',
        'atcd_family_chir',
        'consciousness',
        'mucous_membranes',
        'blood_pressure',
        'pulse',
        'temperature',
        'blood_sugar',
        'weight',
        'skin_fold_major',
        'skin_fold_minor',
        'lower_limb_edema',
        'calves',
        'physical_exam_cardio',
        'physical_exam_pulmonary',
        'physical_exam_neurological',
        'physical_exam_locomotor',
        'physical_exam_digestive',
        'physical_exam_others',
        'syndromic_summary',
        'diagnostic_hypotheses',
        'emergency_management',
        'positive_diagnostic',
        'tests_biology',
        'tests_imaging',
        'treatments',
        'follow_up',
    ];

    protected $casts = [
        'date' => 'date',
        'temperature' => 'float',
        'weight' => 'float',
        'pulse' => 'integer',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
