<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\PatientTreatmentAct;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->input('search', ''));
        $perPage = (int) $request->input('per_page', 5);
        $perPage = max(1, min($perPage, 50));

        $patientsQuery = Patient::query();

        if ($search !== '') {
            $patientsQuery->where(function ($query) use ($search) {
                $query->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");

                if (is_numeric($search)) {
                    $query->orWhere('id', (int) $search);
                }
            });
        }

        $patients = $patientsQuery
            ->with([
                'appointments' => function ($query) {
                    $query->latest('appointment_date')->limit(1);
                },
                'medicalRecords' => function ($query) {
                    $query->latest()->limit(1);
                },
            ])
            ->latest()
            ->paginate($perPage);

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
            'phone' => ['nullable', 'string', 'max:20'],
            'gender' => ['required', 'in:M,F,Other'],
            'age' => ['required', 'integer', 'min:0', 'max:120'],
            'contact_first_name' => ['nullable', 'string', 'max:255'],
            'contact_last_name' => ['nullable', 'string', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:20'],
            'contact_relationship' => ['nullable', 'in:tuteur_legal,parent,proche,autre'],
            'contact_is_patient' => ['nullable', 'boolean'],
            'contact_patient_id' => ['nullable', 'integer', 'exists:patients,id'],
        ]);

        $this->enforceContactRules($validated, null);

        if (!empty($validated['phone'])) {
            $normalizedPhone = $this->normalizePhone($validated['phone']);
            $alreadyExists = Patient::query()
                ->whereRaw("REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '.', ''), '+', '') = ?", [$normalizedPhone])
                ->exists();

            if ($alreadyExists) {
                return response()->json([
                    'message' => 'Un patient avec ce numero de telephone existe deja.',
                    'errors' => [
                        'phone' => ['Ce numero est deja utilise.'],
                    ],
                ], 422);
            }
        }

        $patient = Patient::create($this->buildPatientPayload($validated));

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
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'gender' => ['sometimes', 'required', 'in:M,F,Other'],
            'age' => ['sometimes', 'required', 'integer', 'min:0', 'max:120'],
            'contact_first_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'contact_last_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'contact_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'contact_relationship' => ['sometimes', 'nullable', 'in:tuteur_legal,parent,proche,autre'],
            'contact_is_patient' => ['sometimes', 'nullable', 'boolean'],
            'contact_patient_id' => ['sometimes', 'nullable', 'integer', 'exists:patients,id'],
        ]);

        $candidate = array_merge($patient->toArray(), $validated);
        $this->enforceContactRules($candidate, $patient);

        if (array_key_exists('phone', $validated) && !empty($validated['phone'])) {
            $normalizedPhone = $this->normalizePhone($validated['phone']);
            $alreadyExists = Patient::query()
                ->where('id', '!=', $patient->id)
                ->whereRaw("REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '.', ''), '+', '') = ?", [$normalizedPhone])
                ->exists();

            if ($alreadyExists) {
                return response()->json([
                    'message' => 'Un patient avec ce numero de telephone existe deja.',
                    'errors' => [
                        'phone' => ['Ce numero est deja utilise.'],
                    ],
                ], 422);
            }
        }

        $patient->update($this->buildPatientPayload($validated));

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

    /**
     * Build patient payload from UI fields.
     * Age is converted to date_of_birth to match database schema.
     */
    private function buildPatientPayload(array $validated): array
    {
        $payload = $validated;

        if (array_key_exists('phone', $validated)) {
            $payload['phone'] = trim((string) $validated['phone']) === ''
                ? null
                : $this->normalizePhone($validated['phone']);
        }

        if (array_key_exists('contact_phone', $validated)) {
            $payload['contact_phone'] = trim((string) $validated['contact_phone']) === ''
                ? null
                : $this->normalizePhone($validated['contact_phone']);
        }

        if (array_key_exists('contact_is_patient', $validated)) {
            $payload['contact_is_patient'] = (bool) $validated['contact_is_patient'];
        }

        if (array_key_exists('contact_patient_id', $validated)) {
            $payload['contact_patient_id'] = empty($validated['contact_patient_id'])
                ? null
                : (int) $validated['contact_patient_id'];
        }

        if (!empty($payload['contact_patient_id'])) {
            $linkedPatient = Patient::query()->find((int) $payload['contact_patient_id']);
            if ($linkedPatient) {
                $payload['contact_first_name'] = $linkedPatient->first_name;
                $payload['contact_last_name'] = $linkedPatient->last_name;
                $payload['contact_phone'] = $linkedPatient->phone ?? $linkedPatient->contact_phone;
                $payload['contact_is_patient'] = true;
            }
        }

        if (array_key_exists('contact_is_patient', $payload) && $payload['contact_is_patient'] === false) {
            $payload['contact_patient_id'] = null;
        }

        if (array_key_exists('age', $validated)) {
            $age = (int) $validated['age'];
            $payload['date_of_birth'] = Carbon::today()->subYears($age)->toDateString();
            unset($payload['age']);
        }

        return $payload;
    }

    /**
     * Normalize phone for consistent duplicate detection/storage.
     */
    private function normalizePhone(string $phone): string
    {
        return preg_replace('/\D/', '', trim($phone)) ?? trim($phone);
    }

    /**
     * Enforce patient/contact consistency for robust contactability.
     */
    private function enforceContactRules(array $data, ?Patient $patient): void
    {
        $phone = trim((string) ($data['phone'] ?? ''));
        $contactFirstName = trim((string) ($data['contact_first_name'] ?? ''));
        $contactLastName = trim((string) ($data['contact_last_name'] ?? ''));
        $contactPhone = trim((string) ($data['contact_phone'] ?? ''));
        $contactRelationship = trim((string) ($data['contact_relationship'] ?? ''));
        $contactPatientId = $data['contact_patient_id'] ?? null;
        $contactIsPatient = filter_var($data['contact_is_patient'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $age = (int) ($data['age'] ?? 0);

        if (!$contactPhone && !empty($contactPatientId)) {
            $linkedPatient = Patient::query()->find((int) $contactPatientId);
            if ($linkedPatient) {
                $contactPhone = trim((string) ($linkedPatient->phone ?? $linkedPatient->contact_phone ?? ''));
                $contactFirstName = $contactFirstName !== '' ? $contactFirstName : trim((string) $linkedPatient->first_name);
                $contactLastName = $contactLastName !== '' ? $contactLastName : trim((string) $linkedPatient->last_name);
            }
        }

        $hasOwnPhone = $phone !== '';
        $hasAnyContactField = $contactFirstName !== ''
            || $contactLastName !== ''
            || $contactPhone !== ''
            || $contactRelationship !== ''
            || !empty($contactPatientId);

        if ($contactIsPatient && empty($contactPatientId)) {
            throw ValidationException::withMessages([
                'contact_patient_id' => ['Selectionnez le patient correspondant au contact.'],
            ]);
        }

        if (!$hasOwnPhone) {
            $messages = [];

            if ($contactFirstName === '') {
                $messages['contact_first_name'][] = 'Le prenom du contact est obligatoire si le patient n\'a pas de telephone.';
            }
            if ($contactLastName === '') {
                $messages['contact_last_name'][] = 'Le nom du contact est obligatoire si le patient n\'a pas de telephone.';
            }
            if ($contactPhone === '') {
                $messages['contact_phone'][] = 'Le telephone du contact est obligatoire si le patient n\'a pas de telephone.';
            }
            if ($contactRelationship === '') {
                $messages['contact_relationship'][] = 'La relation du contact est obligatoire si le patient n\'a pas de telephone.';
            }

            if (!empty($messages)) {
                throw ValidationException::withMessages($messages);
            }
        }

        if ($age < 18 && $hasAnyContactField && !in_array($contactRelationship, ['tuteur_legal', 'parent'], true)) {
            throw ValidationException::withMessages([
                'contact_relationship' => ['Pour un mineur, la relation doit etre tuteur_legal ou parent.'],
            ]);
        }

        if ($age < 18 && !$hasOwnPhone && !$hasAnyContactField) {
            throw ValidationException::withMessages([
                'contact_phone' => ['Un mineur sans telephone personnel doit avoir un contact tuteur joignable.'],
            ]);
        }

        if ($patient && !empty($contactPatientId) && (int) $contactPatientId === (int) $patient->id) {
            throw ValidationException::withMessages([
                'contact_patient_id' => ['Le patient ne peut pas etre son propre contact tiers.'],
            ]);
        }
    }
}
