<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\PatientTreatmentAct;
use App\Models\MedicalRecord;
use App\Models\PatientTreatment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class PatientController extends Controller
{
    /**
     * Liste paginée des patients avec recherche et tri optimisé.
     */
    public function index(Request $request)
    {
        $search = trim((string) $request->input('search', ''));
        $perPage = (int) $request->input('per_page', 10);
        $perPage = max(1, min($perPage, 100));

        $patientsQuery = Patient::query();

        if ($search !== '') {
            // Check if phone_normalized column exists to avoid SQL errors during migration transition
            $hasNormalizedColumn = Schema::hasColumn('patients', 'phone_normalized');
            $digitsOnly = preg_replace('/\D/', '', $search);

            $patientsQuery->where(function ($query) use ($search, $hasNormalizedColumn, $digitsOnly) {
                $query->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%");
                
                if ($digitsOnly !== '') {
                    if ($hasNormalizedColumn) {
                        $query->orWhere('phone_normalized', 'like', "%{$digitsOnly}%");
                    } else {
                        $query->orWhere('phone', 'like', "%{$search}%");
                    }
                }

                if (is_numeric($search)) {
                    $query->orWhere('id', (int) $search);
                }
            });
        }

        // Filtre par statut (via scopes optimisés)
        $status = $request->input('status');
        if ($status && $status !== 'all') {
            // Note: Le statut est dynamique, on filtre sur les flags calculés
            if ($status === 'En traitement') {
                $patientsQuery->whereHas('patientTreatments', function($q) {
                    $q->whereIn('status', ['planned', 'in_progress']);
                });
            } elseif ($status === 'Diagnostic') {
                $patientsQuery->where(function($q) {
                    $q->has('medicalRecords')->orWhereHas('patientTreatments', function($sq) {
                        $sq->where('status', 'completed');
                    });
                });
            } elseif ($status === 'Nouveau') {
                $patientsQuery->doesntHave('medicalRecords')
                    ->doesntHave('patientTreatments');
            }
        }

        // Optimisation N+1 via sous-requêtes SQL
        $this->applySummaryScopes($patientsQuery);

        // Gestion du tri côté serveur
        $sortBy = $request->input('sort_by', 'id');
        $sortOrder = $request->input('sort_order', 'desc');

        $allowedSortFields = [
            'id', 
            'first_name', 
            'last_name', 
            'phone', 
            'last_visit_date_precalc'
        ];

        if (in_array($sortBy, $allowedSortFields)) {
            $patientsQuery->orderBy($sortBy, $sortOrder === 'asc' ? 'asc' : 'desc');
        } else {
            $patientsQuery->latest();
        }

        $patients = $patientsQuery->paginate($perPage);

        // Transformation légère pour le formatage final
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
            'address' => ['nullable', 'string', 'max:500'],
            'general_state' => ['nullable', 'string', 'max:2000'],
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
                ->where('phone_normalized', $normalizedPhone)
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
        // On recharge le patient avec les scopes optimisés (N+1 safe)
        $query = Patient::query()->where('id', $patient->id);
        $this->applySummaryScopes($query);
        
        $patient = $query->firstOrFail();

        $this->buildPatientSummary($patient);

        return response()->json($patient);
    }

    /**
     * Retourne le resume des traitements pour un patient (totaux encaisses).
     */
    public function treatmentSummaries(Patient $patient)
    {
        // On s'assure que le patient est bien chargé
        $summaries = $patient->patientTreatments()
            ->with(['medicalRecords' => function($q) {
                // On s'assure de ne sélectionner que les records liés à ce traitement spécifique
                // Le lien hasMany fait déjà ce filtrage par patient_treatment_id
                $q->select('id', 'patient_treatment_id', 'amount_collected', 'date');
            }])
            ->get()
            ->map(function($treatment) {
                // Calcul de la somme encaissée pour ce traitement spécifique
                $totalCollected = (float) $treatment->medicalRecords->sum('amount_collected');
                
                return [
                    'id' => $treatment->id,
                    'name' => $treatment->name,
                    'status' => $treatment->status,
                    'total_collected' => $totalCollected,
                    'start_date' => $treatment->start_date,
                    'sessions_count' => $treatment->medicalRecords->count(),
                ];
            });

        return response()->json($summaries);
    }

    public function update(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'gender' => ['sometimes', 'required', 'in:M,F,Other'],
            'age' => ['sometimes', 'required', 'integer', 'min:0', 'max:120'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'general_state' => ['sometimes', 'nullable', 'string', 'max:2000'],
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
                ->where('phone_normalized', $normalizedPhone)
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
     * Applique les sous-requetes SQL pour eviter le probleme N+1.
     * Calcule dynamiquement les dernières infos sans charger de collections d'objets.
     */
    private function applySummaryScopes($query): void
    {
        $query->select('patients.*')
            ->addSelect([
                'last_visit_date_precalc' => MedicalRecord::select('appointments.appointment_date')
                    ->join('appointments', 'medical_records.appointment_id', '=', 'appointments.id')
                    ->whereColumn('medical_records.patient_id', 'patients.id')
                    ->where('appointments.appointment_date', '<=', now())
                    ->where('appointments.status', 'completed')
                    ->latest('appointments.appointment_date')
                    ->limit(1),
                
                'last_appointment_date_precalc' => \App\Models\Appointment::select('appointment_date')
                    ->whereColumn('patient_id', 'patients.id')
                    ->latest('appointment_date')
                    ->limit(1),

                'last_treatment_precalc' => MedicalRecord::select('treatment_performed')
                    ->whereColumn('patient_id', 'patients.id')
                    ->latest('id')
                    ->limit(1),
            ])
        ->withExists(['patientTreatments as has_active_treatment' => function($q) {
            $q->whereIn('status', ['planned', 'in_progress']);
        }])
        ->withExists(['medicalRecords as has_medical_history'])
        ->withExists(['patientTreatments as has_completed_treatment' => function($q) {
            $q->where('status', 'completed');
        }]);
    }

    /**
     * Construit le résumé métier d'un patient.
     * Utilise les champs pré-calculés par SQL pour une performance maximale.
     */
    private function buildPatientSummary(Patient $patient): void
    {
        // On utilise les valeurs pré-calculées par les sous-requêtes SQL
        $patient->last_visit_date = $patient->last_visit_date_precalc 
            ? Carbon::parse($patient->last_visit_date_precalc)->toDateString() 
            : null;
        
        $patient->last_appointment_date = $patient->last_appointment_date_precalc
            ? Carbon::parse($patient->last_appointment_date_precalc)->toDateString()
            : null;

        $patient->last_treatment = $patient->last_treatment_precalc;

        if ($patient->has_active_treatment) {
            $patient->status = 'En traitement';
            return;
        }

        if ($patient->has_medical_history || $patient->has_completed_treatment) {
            $patient->status = 'Diagnostic';
            return;
        }

        $patient->status = 'Nouveau';
    }

    /**
     * Prépare les données pour la sauvegarde.
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
     * Normalise le numéro de téléphone.
     */
    private function normalizePhone(string $phone): string
    {
        return preg_replace('/\D/', '', trim($phone)) ?? trim($phone);
    }

    /**
     * Règles de validation pour les contacts tiers.
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
