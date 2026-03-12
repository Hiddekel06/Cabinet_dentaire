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
            $lastAppointment = $patient->appointments->first();
            $lastRecord = $patient->medicalRecords->first();

            $patient->last_appointment_date = $lastAppointment?->appointment_date;
            $patient->last_appointment_status = $lastAppointment?->status;
            $patient->last_treatment = $lastRecord?->treatment_performed;

            $patient->status = match ($lastAppointment?->status) {
                'pending', 'confirmed' => 'En traitement',
                'completed' => 'Suivi',
                'cancelled' => 'Nouveau',
                default => 'Nouveau',
            };

            return $patient;
        });

        return response()->json($patients);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', 'in:M,F,Other'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
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

        $lastAppointment = $patient->appointments->first();
        $lastRecord = $patient->medicalRecords->first();

        $patient->last_appointment_date = $lastAppointment?->appointment_date;
        $patient->last_appointment_status = $lastAppointment?->status;
        $patient->last_treatment = $lastRecord?->treatment_performed;

        $patient->status = match ($lastAppointment?->status) {
            'pending', 'confirmed' => 'En traitement',
            'completed' => 'Suivi',
            'cancelled' => 'Nouveau',
            default => 'Nouveau',
        };

        return response()->json($patient);
    }

    public function update(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'max:20'],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', 'in:M,F,Other'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
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
}
