<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\PatientTreatment;
use Illuminate\Http\Request;

class PatientTreatmentController extends Controller
{
    public function index(Request $request)
    {
        $query = PatientTreatment::query()
            ->with(['patient', 'nextAppointment', 'acts.dentalAct'])
            ->select('patient_treatments.*');

        // Filtrer par patient
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->input('patient_id'));
        }

        // Filtrer par statut
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $patientTreatments = $query->latest()->paginate(15);

        return response()->json($patientTreatments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'name' => ['required', 'string', 'max:255'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
            'status' => ['nullable', 'in:planned,in_progress,completed,cancelled'],
            'notes' => ['nullable', 'string'],
            'next_appointment_date' => ['required', 'date'],
            'next_appointment_duration' => ['nullable', 'integer', 'min:1'],
            'next_appointment_reason' => ['nullable', 'string'],
            'next_appointment_notes' => ['nullable', 'string'],
            'acts' => ['nullable', 'array'],
            'acts.*.dental_act_id' => ['required_with:acts', 'integer', 'exists:dental_acts,id'],
            'acts.*.quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        // Empêcher la création d'un rendez-vous à une date passée
        if (strtotime($validated['next_appointment_date']) < time()) {
            return response()->json(['message' => 'Impossible de créer un rendez-vous dans le passé.'], 422);
        }

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
            'name' => $validated['name'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'] ?? null,
            'status' => $validated['status'] ?? 'planned',
            'notes' => $validated['notes'] ?? null,
            'next_appointment_id' => $appointment->id,
        ]);

        // Associer les actes si fournis
        if (!empty($validated['acts'])) {
            foreach ($validated['acts'] as $act) {
                $dentalAct = \App\Models\DentalAct::find($act['dental_act_id']);
                $patientTreatment->acts()->create([
                    'dental_act_id' => $dentalAct->id,
                    'quantity' => $act['quantity'] ?? 1,
                    'tarif_snapshot' => $dentalAct->tarif,
                ]);
            }
        }

        $patientTreatment->load(['patient', 'nextAppointment', 'acts.dentalAct']);
        return response()->json($patientTreatment, 201);
    }

    public function show(PatientTreatment $patientTreatment)
    {
        $patientTreatment->load(['patient', 'medicalRecords', 'nextAppointment', 'acts.dentalAct']);

        return response()->json($patientTreatment);
    }

    public function update(Request $request, PatientTreatment $patientTreatment)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
            'status' => ['nullable', 'in:planned,in_progress,completed,cancelled'],
            'notes' => ['nullable', 'string'],
            'next_appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
            'acts' => ['nullable', 'array'],
            'acts.*.dental_act_id' => ['required_with:acts', 'integer', 'exists:dental_acts,id'],
            'acts.*.quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        $patientTreatment->update($validated);

        // Mise à jour des actes associés si fournis
        if ($request->has('acts')) {
            // On supprime les anciens actes pour ce traitement
            $patientTreatment->acts()->delete();
            foreach ($validated['acts'] as $act) {
                $dentalAct = \App\Models\DentalAct::find($act['dental_act_id']);
                $patientTreatment->acts()->create([
                    'dental_act_id' => $dentalAct->id,
                    'quantity' => $act['quantity'] ?? 1,
                    'tarif_snapshot' => $dentalAct->tarif,
                ]);
            }
        }

        $patientTreatment->load(['patient', 'nextAppointment', 'acts.dentalAct']);
        return response()->json($patientTreatment);
    }

    public function destroy(PatientTreatment $patientTreatment)
    {
        $patientTreatment->delete();

        return response()->noContent();
    }
}
