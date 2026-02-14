<?php

namespace App\Http\Controllers;

use App\Models\MedicalRecord;
use Illuminate\Http\Request;

class MedicalRecordController extends Controller
{
    public function index(Request $request)
    {
        $query = MedicalRecord::query()->with(['patient', 'appointment', 'patientTreatment', 'creator']);

        // Filtrer par patient
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->input('patient_id'));
        }

        // Filtrer par rendez-vous
        if ($request->has('appointment_id')) {
            $query->where('appointment_id', $request->input('appointment_id'));
        }

        // Filtrer par traitement patient
        if ($request->has('patient_treatment_id')) {
            $query->where('patient_treatment_id', $request->input('patient_treatment_id'));
        }

        $records = $query->latest()->paginate(15);

        return response()->json($records);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
            'patient_treatment_id' => ['nullable', 'integer', 'exists:patient_treatments,id'],
            'treatment_description' => ['required', 'string'],
            'diagnosis' => ['nullable', 'string'],
            'observations' => ['nullable', 'string'],
            'next_action' => ['nullable', 'string'],
            'appointment_notes' => ['nullable', 'string'],
        ]);

        // Ajouter l'utilisateur connecté comme créateur
        $validated['created_by'] = $request->user()->id;

        $record = MedicalRecord::create($validated);
        $record->load(['patient', 'appointment', 'patientTreatment', 'creator']);

        return response()->json($record, 201);
    }

    public function show(MedicalRecord $medicalRecord)
    {
        $medicalRecord->load(['patient', 'appointment', 'patientTreatment', 'creator']);

        return response()->json($medicalRecord);
    }

    public function update(Request $request, MedicalRecord $medicalRecord)
    {
        $validated = $request->validate([
            'treatment_description' => ['sometimes', 'required', 'string'],
            'diagnosis' => ['nullable', 'string'],
            'observations' => ['nullable', 'string'],
            'next_action' => ['nullable', 'string'],
            'appointment_notes' => ['nullable', 'string'],
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
            'patient_treatment_id' => ['nullable', 'integer', 'exists:patient_treatments,id'],
        ]);

        $medicalRecord->update($validated);
        $medicalRecord->load(['patient', 'appointment', 'patientTreatment', 'creator']);

        return response()->json($medicalRecord);
    }

    public function destroy(MedicalRecord $medicalRecord)
    {
        $medicalRecord->delete();

        return response()->noContent();
    }
}
