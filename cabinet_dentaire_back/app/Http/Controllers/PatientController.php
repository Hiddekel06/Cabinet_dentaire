<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\PatientTreatmentAct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PatientController extends Controller
{
    public function index()
    {
        $patients = Patient::query()
            ->with([
                'appointments' => function ($query) {
                    $query->latest('appointment_date')->limit(1);
                },
                'medicalRecords' => function ($query) {
                    $query->latest()->limit(1);
                },
            ])
            ->latest()
            ->paginate(5);

        $patients->getCollection()->transform(function ($patient) {
            $this->buildPatientSummary($patient);
            return $patient;
        });

        return response()->json($patients);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
        ]);

        $patient = Patient::create($validated);

        return response()->json($patient, 201);
    }

    public function show(Patient $patient)
    {
        $patient->load([
            'appointments' => function ($query) {
                $query->latest('appointment_date')->limit(1);
            },
            'medicalRecords' => function ($query) {
                $query->latest()->limit(1);
            },
        ]);

        $this->buildPatientSummary($patient);

        return response()->json($patient);
    }

    public function update(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'max:20'],
        ]);

        $patient->update($validated);

        return response()->json($patient);
    }

    public function destroy(Patient $patient)
    {
        $patient->delete();

        return response()->noContent();
    }

    /**
     * Retourne les actes realises d'un patient qui ne sont pas encore factures.
     */
    public function billableActs(Patient $patient)
    {
        $acts = PatientTreatmentAct::query()
            ->with([
                'dentalAct:id,code,name,tarif',
                'patientTreatment:id,patient_id,name,start_date,status',
            ])
            ->whereHas('patientTreatment', function ($query) use ($patient) {
                $query->where('patient_id', $patient->id);
            })
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('invoice_items')
                    ->whereColumn('invoice_items.patient_treatment_act_id', 'patient_treatment_acts.id');
            })
            ->latest('id')
            ->get()
            ->map(function (PatientTreatmentAct $act) {
                $unitPrice = $act->tarif_snapshot ?? $act->dentalAct?->tarif ?? 0;
                $quantity = (int) ($act->quantity ?? 1);

                return [
                    'id' => $act->id,
                    'patient_treatment_id' => $act->patient_treatment_id,
                    'patient_treatment_name' => $act->patientTreatment?->name,
                    'patient_treatment_status' => $act->patientTreatment?->status,
                    'dental_act_id' => $act->dental_act_id,
                    'dental_act_code' => $act->dentalAct?->code,
                    'dental_act_name' => $act->dentalAct?->name,
                    'quantity' => $quantity,
                    'unit_price' => (float) $unitPrice,
                    'subtotal' => (float) ($unitPrice * $quantity),
                ];
            })
            ->values();

        return response()->json([
            'patient_id' => $patient->id,
            'billable_acts' => $acts,
        ]);
    }

    /**
     * Build patient dashboard summary with business-driven status.
     *
     * Rules:
     * - last_visit_date = latest COMPLETED appointment only
     * - status = En traitement if active treatment exists (planned/in_progress)
     * - status = Suivi if completed history exists (appointment/treatment)
     * - otherwise = Nouveau
     */
    private function buildPatientSummary(Patient $patient): void
    {
        $lastAppointment = $patient->appointments->first();
        $lastRecord = $patient->medicalRecords->first();

        // Last visit = last validated session only (medical record exists).
        // A missed/no-show appointment without validated session is not counted.
        $lastVisitDate = $patient->medicalRecords()
            ->join('appointments', 'medical_records.appointment_id', '=', 'appointments.id')
            ->max('appointments.appointment_date');

        $hasActiveTreatment = $patient->patientTreatments()
            ->whereIn('status', ['planned', 'in_progress'])
            ->exists();

        $hasCompletedHistory = $patient->medicalRecords()->exists()
            || $patient->patientTreatments()
                ->where('status', 'completed')
                ->exists();

        $patient->last_visit_date = $lastVisitDate;
        $patient->last_appointment_date = $lastAppointment?->appointment_date;
        $patient->last_appointment_status = $lastAppointment?->status;
        $patient->last_treatment = $lastRecord?->treatment_performed;

        if ($hasActiveTreatment) {
            $patient->status = 'En traitement';
            return;
        }

        if ($hasCompletedHistory) {
            $patient->status = 'Suivi';
            return;
        }

        $patient->status = 'Nouveau';
    }
}
