<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\DentalAct;
use App\Models\PatientTreatment;
use App\Models\PatientTreatmentAct;
use App\Models\MedicalRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class AppointmentController extends Controller
{
    /**
     * Affiche la vue calendrier mobile PWA
     */
    public function pwaCalendar()
    {
        // On retourne une vue simple (à créer ensuite)
        return view('pwa.calendar');
    }
    public function index()
    {
        $query = Appointment::query()->with(['patient', 'dentist']);

        // Filtre par date si ?date=YYYY-MM-DD fourni
        if (request()->has('date')) {
            $date = request('date');
            $dayStart = Carbon::parse($date)->startOfDay();
            $dayEnd = Carbon::parse($date)->endOfDay();
            $query->whereBetween('appointment_date', [$dayStart, $dayEnd]);

            return response()->json(
                $query->orderBy('appointment_date')->paginate(15)
            );
        }

        return response()->json(
            $query->latest()->paginate(15)
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'dentist_id' => ['required', 'integer', 'exists:users,id'],
            'appointment_date' => ['required', 'date'],
            'appointment_time_specified' => ['nullable', 'boolean'],
            'duration' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'in:pending,confirmed,completed,cancelled,absent'],
            'reason' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $validated['appointment_time_specified'] = $this->resolveTimeSpecified(
            $request->input('appointment_date'),
            $request->input('appointment_time_specified')
        );

        // Empêcher la création d'un rendez-vous à une date passée
        if (strtotime($validated['appointment_date']) < time()) {
            return response()->json(['message' => 'Impossible de créer un rendez-vous dans le passé.'], 422);
        }

        $appointment = DB::transaction(function () use ($validated) {
            $appointment = Appointment::create($validated);

            $activeTreatment = PatientTreatment::where('patient_id', $validated['patient_id'])
                ->whereIn('status', ['planned', 'in_progress'])
                ->latest('id')
                ->first();

            if ($activeTreatment) {
                $activeTreatment->update([
                    'next_appointment_id' => $appointment->id,
                ]);
            } else {
                $startDate = Carbon::parse($validated['appointment_date'])->toDateString();
                $defaultTreatment = PatientTreatment::create([
                    'patient_id' => $validated['patient_id'],
                    'name' => 'Consultation simple',
                    'start_date' => $startDate,
                    'status' => 'planned',
                    'notes' => 'Traitement créé automatiquement depuis la vue rendez-vous.',
                    'next_appointment_id' => $appointment->id,
                ]);

                $consultationSimple = $this->resolveConsultationSimpleAct();
                if ($consultationSimple) {
                    PatientTreatmentAct::create([
                        'patient_treatment_id' => $defaultTreatment->id,
                        'dental_act_id' => $consultationSimple->id,
                        'quantity' => 1,
                        'tarif_snapshot' => $consultationSimple->tarif,
                    ]);
                }
            }

            return $appointment;
        });

        return response()->json($appointment->load(['patient', 'dentist']), 201);
    }

    public function show(Appointment $appointment)
    {
        return response()->json($appointment->load(['patient', 'dentist']));
    }

    public function update(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'patient_id' => ['sometimes', 'required', 'integer', 'exists:patients,id'],
            'dentist_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'appointment_date' => ['sometimes', 'required', 'date'],
            'appointment_time_specified' => ['nullable', 'boolean'],
            'duration' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'in:pending,confirmed,completed,cancelled,absent'],
            'reason' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($request->has('appointment_date') || $request->has('appointment_time_specified')) {
            $validated['appointment_time_specified'] = $this->resolveTimeSpecified(
                $request->input('appointment_date', $appointment->appointment_date?->format('Y-m-d H:i:s')),
                $request->input('appointment_time_specified')
            );
        }

        // Empêcher la modification d'un rendez-vous à une date passée
        if (isset($validated['appointment_date']) && strtotime($validated['appointment_date']) < time()) {
            return response()->json(['message' => 'Impossible de modifier un rendez-vous à une date passée.'], 422);
        }

        $appointment->update($validated);

        return response()->json($appointment);
    }

    public function destroy(Appointment $appointment)
    {
        $appointment->delete();

        return response()->noContent();
    }

    /**
     * Reschedule an appointment with optional treatment synchronization
     * PATCH /api/appointments/{id}/reschedule-with-sync
     */
    public function rescheduleWithSync(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'appointment_date' => ['required', 'date'],
            'appointment_time_specified' => ['nullable', 'boolean'],
            'sync_treatments' => ['nullable', 'boolean'],
        ]);

        // Prevent past date changes
        if (strtotime($validated['appointment_date']) < time()) {
            return response()->json(['message' => 'Impossible de modifier un rendez-vous à une date passée.'], 422);
        }

        $syncTreatments = boolval($validated['sync_treatments'] ?? false);
        $linkedTreatment = null;

        return DB::transaction(function () use ($appointment, $validated, $syncTreatments, &$linkedTreatment) {
            // Resolve time specification flag
            $validated['appointment_time_specified'] = $this->resolveTimeSpecified(
                $validated['appointment_date'],
                $validated['appointment_time_specified'] ?? null
            );

            // Check for linked treatment
            $linkedTreatment = PatientTreatment::where('next_appointment_id', $appointment->id)
                ->first();

            // If sync requested but no treatment link, just update appointment
            if ($syncTreatments && !$linkedTreatment) {
                $appointment->update($validated);
                return response()->json([
                    'appointment' => $appointment,
                    'treatments_updated' => 0,
                    'status' => 'success',
                    'message' => 'Rendez-vous déplacé (aucun traitement lié)',
                ]);
            }

            // If sync requested AND treatment linked
            if ($syncTreatments && $linkedTreatment) {
                // Verify no medical records exist for this appointment
                $medicalRecordCount = MedicalRecord::where('appointment_id', $appointment->id)->count();
                if ($medicalRecordCount > 0) {
                    throw new \Exception('Impossible de synchroniser : des séances médicales existent déjà pour ce rendez-vous');
                }

                // Update appointment date
                $appointment->update($validated);

                // Update treatment start_date if appointment date changed
                if ($linkedTreatment->start_date !== $validated['appointment_date']) {
                    $linkedTreatment->update([
                        'start_date' => $validated['appointment_date'],
                    ]);
                }

                // Log sync action
                \Illuminate\Support\Facades\Log::info('Appointment rescheduled with treatment sync', [
                    'appointment_id' => $appointment->id,
                    'treatment_id' => $linkedTreatment->id,
                    'old_date' => $appointment->getOriginal('appointment_date'),
                    'new_date' => $validated['appointment_date'],
                    'user_id' => Auth::id(),
                ]);

                return response()->json([
                    'appointment' => $appointment,
                    'treatment' => $linkedTreatment->fresh(),
                    'treatments_updated' => 1,
                    'status' => 'success',
                    'message' => 'Rendez-vous et traitement synchronisés',
                ]);
            }

            // If NO sync requested, just update appointment (simple update)
            $appointment->update($validated);

            return response()->json([
                'appointment' => $appointment,
                'treatments_updated' => 0,
                'status' => 'success',
                'message' => 'Rendez-vous déplacé (traitement non synchronisé)',
                'warning' => $linkedTreatment ? 'Le traitement associé n\'a pas été mis à jour' : null,
            ]);
        });
    }

    /**
     * Check if appointment is linked to a treatment
     * GET /api/appointments/{id}/treatment-link
     */
    public function getLinkedTreatment(Appointment $appointment)
    {
        $treatment = PatientTreatment::where('next_appointment_id', $appointment->id)
            ->with(['acts', 'medicalRecords'])
            ->first();

        if (!$treatment) {
            return response()->json(['linked' => false]);
        }

        $medicalRecordCount = MedicalRecord::where('patient_treatment_id', $treatment->id)->count();

        return response()->json([
            'linked' => true,
            'treatment' => $treatment,
            'medical_records_count' => $medicalRecordCount,
            'can_sync' => $medicalRecordCount === 0, // Can only sync if no medical records yet
        ]);
    }

    /**
     * Mark appointment as absent and reschedule to new date
     * POST /api/appointments/{id}/mark-absent-and-reschedule
     */
    public function markAbsentAndReschedule(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'new_appointment_date' => ['required', 'date'],
            'appointment_time_specified' => ['nullable', 'boolean'],
        ]);

        // Prevent scheduling in past
        if (strtotime($validated['new_appointment_date']) < time()) {
            return response()->json([
                'message' => 'Impossible de programmer un rendez-vous dans le passé.',
            ], 422);
        }

        return DB::transaction(function () use ($appointment, $validated) {
            // Resolve time specification
            $validated['appointment_time_specified'] = $this->resolveTimeSpecified(
                $validated['new_appointment_date'],
                $validated['appointment_time_specified'] ?? null
            );

            // Get linked treatment if exists
            $linkedTreatment = PatientTreatment::where('next_appointment_id', $appointment->id)
                ->first();

            // Create new appointment with same details as original
            $newAppointment = Appointment::create([
                'patient_id' => $appointment->patient_id,
                'dentist_id' => $appointment->dentist_id,
                'appointment_date' => $validated['new_appointment_date'],
                'appointment_time_specified' => $validated['appointment_time_specified'],
                'duration' => $appointment->duration,
                'status' => 'pending',
                'reason' => $appointment->reason,
                'notes' => $appointment->notes,
            ]);

            // Mark original appointment as Absent
            $appointment->update(['status' => 'absent']);

            // Update linked treatment's next_appointment_id to point to new appointment
            if ($linkedTreatment) {
                $linkedTreatment->update([
                    'next_appointment_id' => $newAppointment->id,
                ]);
            }

            // Log action
            \Illuminate\Support\Facades\Log::info('Appointment marked as absent and rescheduled', [
                'old_appointment_id' => $appointment->id,
                'new_appointment_id' => $newAppointment->id,
                'treatment_id' => $linkedTreatment?->id,
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'old_appointment' => $appointment,
                'new_appointment' => $newAppointment,
                'linked_treatment' => $linkedTreatment?->fresh(),
                'status' => 'success',
                'message' => 'Rendez-vous marqué comme absent et reporté avec succès',
            ], 201);
        });
    }

    private function resolveTimeSpecified(?string $rawDate, $explicitFlag = null): bool
    {
        if (!is_null($explicitFlag)) {
            return filter_var($explicitFlag, FILTER_VALIDATE_BOOLEAN);
        }

        // Date pure (YYYY-MM-DD): heure non précisée.
        if ($rawDate && preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($rawDate))) {
            return false;
        }

        // DateTime fourni: heure précisée.
        return true;
    }

    private function resolveConsultationSimpleAct(): ?DentalAct
    {
        return DentalAct::query()
            ->whereRaw('LOWER(name) = ?', ['consultation simple'])
            ->orWhereRaw('LOWER(code) = ?', ['cs'])
            ->first();
    }
}
