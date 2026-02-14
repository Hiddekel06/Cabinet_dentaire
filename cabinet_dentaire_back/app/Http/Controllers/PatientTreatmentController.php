<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\PatientTreatment;
use Illuminate\Http\Request;

class PatientTreatmentController extends Controller
{
    public function index(Request $request)
    {
        $query = PatientTreatment::query()->with(['patient', 'treatment']);

        // Filtrer par patient
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->input('patient_id'));
        }

        // Filtrer par statut
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filtrer par traitement
        if ($request->has('treatment_id')) {
            $query->where('treatment_id', $request->input('treatment_id'));
        }

        $patientTreatments = $query->latest()->paginate(15);

        return response()->json($patientTreatments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'treatment_id' => ['required', 'integer', 'exists:treatments,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
            'status' => ['nullable', 'in:planned,in_progress,completed,cancelled'],
            'total_sessions' => ['nullable', 'integer', 'min:1'],
            'completed_sessions' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
            'next_appointment_date' => ['required', 'date'],
            'next_appointment_duration' => ['nullable', 'integer', 'min:1'],
            'next_appointment_reason' => ['nullable', 'string'],
            'next_appointment_notes' => ['nullable', 'string'],
        ]);

        $appointment = Appointment::create([
            'patient_id' => $validated['patient_id'],
            'dentist_id' => $request->user()->id,
            'appointment_date' => $validated['next_appointment_date'],
            'duration' => $validated['next_appointment_duration'] ?? null,
            'reason' => $validated['next_appointment_reason'] ?? null,
            'notes' => $validated['next_appointment_notes'] ?? null,
        ]);

        $patientTreatment = PatientTreatment::create([
            'patient_id' => $validated['patient_id'],
            'treatment_id' => $validated['treatment_id'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'] ?? null,
            'status' => $validated['status'] ?? null,
            'total_sessions' => $validated['total_sessions'] ?? null,
            'completed_sessions' => $validated['completed_sessions'] ?? 0,
            'notes' => $validated['notes'] ?? null,
            'next_appointment_id' => $appointment->id,
        ]);
        $patientTreatment->load(['patient', 'treatment', 'nextAppointment']);

        return response()->json($patientTreatment, 201);
    }

    public function show(PatientTreatment $patientTreatment)
    {
        $patientTreatment->load(['patient', 'treatment', 'medicalRecords', 'nextAppointment']);

        return response()->json($patientTreatment);
    }

    public function update(Request $request, PatientTreatment $patientTreatment)
    {
        $validated = $request->validate([
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
            'status' => ['nullable', 'in:planned,in_progress,completed,cancelled'],
            'total_sessions' => ['nullable', 'integer', 'min:1'],
            'completed_sessions' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $patientTreatment->update($validated);
        $patientTreatment->load(['patient', 'treatment', 'nextAppointment']);

        return response()->json($patientTreatment);
    }

    public function destroy(PatientTreatment $patientTreatment)
    {
        $patientTreatment->delete();

        return response()->noContent();
    }
}
