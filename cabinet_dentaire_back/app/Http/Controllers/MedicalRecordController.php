<?php

namespace App\Http\Controllers;

use App\Models\MedicalRecord;
use App\Models\PatientTreatment;
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
            'treatment_performed' => ['required', 'string'],
            'diagnosis' => ['nullable', 'string'],
            'observations' => ['nullable', 'string'],
            'next_action' => ['nullable', 'string'],
            'appointment_notes' => ['nullable', 'string'],
            'amount_collected' => ['nullable', 'numeric', 'min:0'],
        ]);

        $appointmentId = $validated['appointment_id'] ?? null;

        // Si aucun rendez-vous n'est fourni (soin en direct), on en crée un automatiquement pour la traçabilité
        if (!$appointmentId) {
            $appointment = \App\Models\Appointment::create([
                'patient_id' => $validated['patient_id'],
                'dentist_id' => $request->user()->id,
                'assigned_doctor_id' => $request->user()->id,
                'appointment_date' => now(),
                'appointment_time_specified' => true,
                'status' => 'completed',
                'reason' => 'Séance en direct (sans RDV préalable)',
                'notes' => 'Généré automatiquement lors de la validation du soin.'
            ]);
            $appointmentId = $appointment->id;
        } else {
            // Valider que l'appointment appartient au bon patient
            $appointment = \App\Models\Appointment::findOrFail($appointmentId);
            if ($appointment->patient_id !== $validated['patient_id']) {
                return response()->json([
                    'message' => 'Le rendez-vous ne correspond pas au patient.',
                    'errors' => ['appointment_id' => ['Le rendez-vous doit appartenir au patient sélectionné.']]
                ], 422);
            }

            // Marquer le rendez-vous existant comme terminé
            $appointment->update([
                'status' => 'completed',
                'appointment_date' => now(), // Force la date à aujourd'hui pour refléter la visite réelle
            ]);
        }

        // Vérification du patient_treatment_id si fourni
        if (!empty($validated['patient_treatment_id'])) {
            $patientTreatment = PatientTreatment::with('nextAppointment')->findOrFail($validated['patient_treatment_id']);

            if ((int) $patientTreatment->patient_id !== (int) $validated['patient_id']) {
                return response()->json([
                    'message' => 'Le traitement ne correspond pas au patient.',
                    'errors' => ['patient_treatment_id' => ['Le traitement doit appartenir au patient sélectionné.']]
                ], 422);
            }
        }

        // Ajouter l'utilisateur connecté comme créateur
        $validated['created_by'] = $request->user()->id;
        $validated['appointment_id'] = $appointmentId;
        $validated['date'] = now()->toDateString();

        $record = MedicalRecord::create($validated);
        $record->load(['patient', 'appointment', 'patientTreatment', 'creator']);

        // Compute collected sum for the related treatment (if any) to show a memo to the client
        $collectedBefore = 0;
        if (!empty($record->patient_treatment_id)) {
            try {
                $collectedBefore = \App\Models\SessionReceipt::query()
                    ->where('patient_treatment_id', $record->patient_treatment_id)
                    ->sum('total_amount');
            } catch (\Throwable $e) {
                $collectedBefore = 0;
            }
        }

        $record->setAttribute('collected_before', (float) $collectedBefore);

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
            'treatment_performed' => ['sometimes', 'required', 'string'],
            'diagnosis' => ['nullable', 'string'],
            'observations' => ['nullable', 'string'],
            'next_action' => ['nullable', 'string'],
            'appointment_notes' => ['nullable', 'string'],
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
            'patient_treatment_id' => ['nullable', 'integer', 'exists:patient_treatments,id'],
            'amount_collected' => ['nullable', 'numeric', 'min:0'],
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
