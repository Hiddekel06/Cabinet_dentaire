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
            'appointment_id' => ['required', 'integer', 'exists:appointments,id'],
            'patient_treatment_id' => ['nullable', 'integer', 'exists:patient_treatments,id'],
            'treatment_performed' => ['required', 'string'],
            'diagnosis' => ['nullable', 'string'],
            'observations' => ['nullable', 'string'],
            'next_action' => ['nullable', 'string'],
            'appointment_notes' => ['nullable', 'string'],
        ]);

        // Valider que l'appointment appartient au bon patient
        $appointment = \App\Models\Appointment::findOrFail($validated['appointment_id']);
        if ($appointment->patient_id !== $validated['patient_id']) {
            return response()->json([
                'message' => 'Le rendez-vous ne correspond pas au patient.',
                'errors' => ['appointment_id' => ['Le rendez-vous doit appartenir au patient sélectionné.']]
            ], 422);
        }

        // Verrou serveur: impossible d'ajouter une seance avant la date du rendez-vous courant du traitement.
        if (!empty($validated['patient_treatment_id'])) {
            $patientTreatment = PatientTreatment::with('nextAppointment')->findOrFail($validated['patient_treatment_id']);

            if ((int) $patientTreatment->patient_id !== (int) $validated['patient_id']) {
                return response()->json([
                    'message' => 'Le traitement ne correspond pas au patient.',
                    'errors' => ['patient_treatment_id' => ['Le traitement doit appartenir au patient sélectionné.']]
                ], 422);
            }

            $currentNextAppointment = $patientTreatment->nextAppointment;
            if ($currentNextAppointment && $currentNextAppointment->appointment_date && $currentNextAppointment->appointment_date->isFuture()) {
                $appointmentDateLabel = $currentNextAppointment->appointment_date->format('d/m/Y H:i');
                $timeSpecified = (bool) ($currentNextAppointment->appointment_time_specified ?? true);
                if (!$timeSpecified) {
                    $appointmentDateLabel = $currentNextAppointment->appointment_date->format('d/m/Y') . ' (heure non précisée)';
                }

                return response()->json([
                    'message' => 'Séance non autorisée: le prochain rendez-vous du traitement n\'est pas encore atteint.',
                    'errors' => [
                        'patient_treatment_id' => [
                            sprintf(
                                'Vous pourrez ajouter une séance à partir du %s.',
                                $appointmentDateLabel
                            )
                        ]
                    ]
                ], 422);
            }
        }

        // Ajouter l'utilisateur connecté comme créateur
        $validated['created_by'] = $request->user()->id;
        // Ajouter la date du jour si non fournie
        $validated['date'] = now()->toDateString();

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
            'treatment_performed' => ['sometimes', 'required', 'string'],
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
