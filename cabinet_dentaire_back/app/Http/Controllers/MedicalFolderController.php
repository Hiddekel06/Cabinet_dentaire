<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;

class MedicalFolderController extends Controller
{
    /**
     * Récupère le dossier médical complet d'un patient
     * Inclut toutes les informations liées en une seule requête optimisée
     */
    public function show(Patient $patient)
    {
        // Charger toutes les relations du patient
        $patient->load([
            'appointments.dentist',
            'medicalRecords.creator',
            'medicalRecords.appointment',
            'medicalRecords.patientTreatment.treatment',
            'patientTreatments.treatment',
            'patientTreatments.medicalRecords',
            'radiographies',
        ]);

        // Statistiques du dossier
        $statistics = [
            'total_appointments' => $patient->appointments->count(),
            'completed_appointments' => $patient->appointments->where('status', 'completed')->count(),
            'pending_appointments' => $patient->appointments->where('status', 'pending')->count(),
            'total_treatments' => $patient->patientTreatments->count(),
            'active_treatments' => $patient->patientTreatments->where('status', 'in_progress')->count(),
            'completed_treatments' => $patient->patientTreatments->where('status', 'completed')->count(),
            'total_medical_records' => $patient->medicalRecords->count(),
            'total_radiographies' => $patient->radiographies->count(),
        ];

        return response()->json([
            'patient' => $patient,
            'statistics' => $statistics,
        ]);
    }

    /**
     * Récupère uniquement les rendez-vous d'un patient
     */
    public function appointments(Patient $patient, Request $request)
    {
        $query = $patient->appointments()->with('dentist');

        // Filtrer par statut
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $appointments = $query->latest('appointment_date')->paginate(15);

        return response()->json($appointments);
    }

    /**
     * Récupère uniquement les dossiers médicaux d'un patient
     */
    public function medicalRecords(Patient $patient)
    {
        $records = $patient->medicalRecords()
            ->with(['creator', 'appointment', 'patientTreatment.treatment'])
            ->latest()
            ->paginate(15);

        return response()->json($records);
    }

    /**
     * Récupère uniquement les traitements en cours d'un patient
     */
    public function treatments(Patient $patient, Request $request)
    {
        $query = $patient->patientTreatments()->with('treatment');

        // Filtrer par statut
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $treatments = $query->latest()->paginate(15);

        return response()->json($treatments);
    }

    /**
     * Récupère uniquement les radiographies d'un patient
     */
    public function radiographies(Patient $patient)
    {
        $radiographies = $patient->radiographies()
            ->latest('scan_date')
            ->paginate(15);

        return response()->json($radiographies);
    }
}
