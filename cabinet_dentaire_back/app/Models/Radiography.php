<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Radiography extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'file_path',
        'scan_date',
        'description',
        'notes',
    ];

    protected $casts = [
        'scan_date' => 'date',
    ];

    /**
     * La radiographie appartient à un patient
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
