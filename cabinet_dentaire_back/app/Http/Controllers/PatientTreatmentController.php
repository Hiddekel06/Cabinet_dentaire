<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\DentalAct;
use App\Models\InvoiceItem;
use App\Models\PatientTreatmentAct;
use App\Models\PatientTreatment;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PatientTreatmentController extends Controller
{
    public function auditLogs(PatientTreatment $patientTreatment)
    {
        $actIds = $patientTreatment->acts()->pluck('id');

        $logs = DB::table('audit_logs')
            ->where(function ($query) use ($patientTreatment, $actIds) {
                $query->where(function ($q) use ($patientTreatment) {
                    $q->where('table_name', 'patient_treatments')
                        ->where('record_id', $patientTreatment->id);
                });

                if ($actIds->isNotEmpty()) {
                    $query->orWhere(function ($q) use ($actIds) {
                        $q->where('table_name', 'patient_treatment_acts')
                            ->whereIn('record_id', $actIds);
                    });
                }
            })
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();

        return response()->json([
            'patient_treatment_id' => $patientTreatment->id,
            'audit_logs' => $logs,
        ]);
    }

    public function index(Request $request)
    {
        $query = PatientTreatment::query()
            ->with(['patient', 'nextAppointment', 'acts.dentalAct'])
            ->select('patient_treatments.*')
            ->addSelect([
                // Calcul du montant total cumulé via SQL
                'total_acts_amount' => PatientTreatmentAct::select(DB::raw('SUM(quantity * tarif_snapshot)'))
                    ->whereColumn('patient_treatment_id', 'patient_treatments.id'),
                
                'acts_count' => PatientTreatmentAct::select(DB::raw('COUNT(*)'))
                    ->whereColumn('patient_treatment_id', 'patient_treatments.id'),
            ])
            // Flag: Si au moins un acte du traitement est dans une facture payée
            ->withExists(['acts as is_invoice_paid_locked' => function($q) {
                $q->whereHas('invoiceItems.invoice', function($sq) {
                    $sq->where('status', 'paid');
                });
            }]);

        // Filtrer par patient
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->input('patient_id'));
        }

        // Filtrer par statut (Supporte "status=planned,in_progress" ou "status=completed")
        if ($request->has('status')) {
            $status = $request->input('status');
            if (str_contains($status, ',')) {
                $query->whereIn('status', explode(',', $status));
            } else {
                $query->where('status', $status);
            }
        }

        // Gestion du tri côté serveur
        $sortBy = $request->input('sort_by', 'start_date');
        $sortOrder = $request->input('sort_order', 'desc');

        $allowedSortFields = ['id', 'name', 'start_date', 'status', 'total_acts_amount'];
        if (in_array($sortBy, $allowedSortFields)) {
            $query->orderBy($sortBy, $sortOrder === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('start_date', 'desc');
        }

        $patientTreatments = $query->paginate(15);

        $patientTreatments->getCollection()->transform(function (PatientTreatment $pt) {
            // Reformatage pour le frontend
            $pt->setAttribute('is_invoice_paid_locked', (bool) $pt->is_invoice_paid_locked);
            $pt->setAttribute('invoice_preview', [
                'status' => $pt->is_invoice_paid_locked ? 'paid' : 'draft',
                'item_count' => (int) $pt->acts_count,
                'total_amount' => (float) round($pt->total_acts_amount, 2),
                'currency' => 'EUR',
            ]);
            return $pt;
        });

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
            'next_appointment_date' => ['nullable', 'date'],
            'next_appointment_duration' => ['nullable', 'integer', 'min:1'],
            'next_appointment_reason' => ['nullable', 'string'],
            'next_appointment_notes' => ['nullable', 'string'],
            'acts' => ['nullable', 'array'],
            'acts.*.dental_act_id' => ['required_with:acts', 'integer', 'exists:dental_acts,id'],
            'acts.*.quantity' => ['nullable', 'integer', 'min:1'],
            'acts.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'agreed_amount' => ['nullable', 'numeric', 'min:0'],
            'agreed_amount_date' => ['nullable', 'date'],
        ]);

        $consultationSimple = $this->resolveConsultationSimpleAct();
        if (!$consultationSimple) {
            return response()->json([
                'message' => 'Acte obligatoire introuvable: Consultation simple.',
            ], 422);
        }

        // Vérifier si le patient a déjà un suivi en cours
        $existingTreatment = PatientTreatment::where('patient_id', $validated['patient_id'])
            ->whereIn('status', ['planned', 'in_progress'])
            ->with('patient')
            ->first();

        if ($existingTreatment) {
            return response()->json([
                'message' => 'Ce patient a déjà un suivi en cours.',
                'error' => 'PATIENT_HAS_ACTIVE_TREATMENT',
                'existing_treatment' => [
                    'id' => $existingTreatment->id,
                    'name' => $existingTreatment->name,
                    'status' => $existingTreatment->status,
                    'start_date' => $existingTreatment->start_date,
                ]
            ], 422);
        }

        // Gestion du prochain rendez-vous
        $appointmentId = null;
        if (!empty($validated['next_appointment_date'])) {
            // Empêcher la création d'un rendez-vous à une date passée
            $nextAppointmentDate = Carbon::parse($validated['next_appointment_date'])->toDateString();
            if ($nextAppointmentDate < Carbon::today()->toDateString()) {
                return response()->json(['message' => 'Impossible de créer un rendez-vous dans le passé.'], 422);
            }

            $appointment = Appointment::create([
                'patient_id' => $validated['patient_id'],
                'dentist_id' => $request->user()->id,
                'appointment_date' => $validated['next_appointment_date'],
                'appointment_time_specified' => false,
                'duration' => $validated['next_appointment_duration'] ?? null,
                'reason' => $validated['next_appointment_reason'] ?? null,
                'notes' => $validated['next_appointment_notes'] ?? null,
            ]);
            $appointmentId = $appointment->id;
        }

        $patientTreatment = PatientTreatment::create([
            'patient_id' => $validated['patient_id'],
            'name' => $validated['name'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'] ?? null,
            'status' => $validated['status'] ?? 'planned',
            'notes' => $validated['notes'] ?? null,
            'next_appointment_id' => $appointmentId,
            'agreed_amount' => $validated['agreed_amount'] ?? null,
            'agreed_amount_date' => $validated['agreed_amount_date'] ?? null,
        ]);

        // Consultation simple obligatoire ajoutee automatiquement au demarrage.
        $mandatoryAct = new PatientTreatmentAct([
            'dental_act_id' => $consultationSimple->id,
            'quantity' => 1,
            'tarif_snapshot' => $consultationSimple->tarif,
        ]);
        $mandatoryAct->patient_treatment_id = $patientTreatment->id;
        $mandatoryAct->created_at = $validated['start_date'] . ' 00:00:00';
        $mandatoryAct->updated_at = $validated['start_date'] . ' 00:00:00';
        $mandatoryAct->save();

        // Associer les actes saisis, hors Consultation simple pour eviter les doublons.
        if (!empty($validated['acts'])) {
            foreach ($validated['acts'] as $act) {
                if ((int) $act['dental_act_id'] === (int) $consultationSimple->id) {
                    continue;
                }

                $dentalAct = DentalAct::find($act['dental_act_id']);
                if (!$dentalAct) {
                    continue;
                }

                $unitPrice = isset($act['unit_price']) ? (float) $act['unit_price'] : $dentalAct->tarif;

                $patientTreatment->acts()->create([
                    'dental_act_id' => $dentalAct->id,
                    'quantity' => $act['quantity'] ?? 1,
                    'tarif_snapshot' => $unitPrice,
                ]);
            }
        }

        $patientTreatment->load(['patient', 'nextAppointment', 'acts.dentalAct']);
        $isPaidLocked = $this->hasPaidInvoice($patientTreatment->id);
        $patientTreatment->setAttribute(
            'is_invoice_paid_locked',
            $isPaidLocked
        );
        $patientTreatment->setAttribute(
            'invoice_preview',
            $this->buildInvoicePreview($patientTreatment, $isPaidLocked)
        );

        $this->logAudit(
            userId: $request->user()?->id,
            action: 'treatment_created',
            tableName: 'patient_treatments',
            recordId: $patientTreatment->id,
            oldValues: null,
            newValues: [
                'patient_id' => $patientTreatment->patient_id,
                'name' => $patientTreatment->name,
                'status' => $patientTreatment->status,
                'start_date' => (string) $patientTreatment->start_date,
            ],
            description: 'Creation du traitement avec ajout automatique de Consultation simple.'
        );

        return response()->json($patientTreatment, 201);
    }

    public function show(PatientTreatment $patientTreatment)
    {
        $patientTreatment->load(['patient', 'medicalRecords', 'nextAppointment', 'acts.dentalAct']);
        $isPaidLocked = $this->hasPaidInvoice($patientTreatment->id);
        $patientTreatment->setAttribute(
            'is_invoice_paid_locked',
            $isPaidLocked
        );
        $patientTreatment->setAttribute(
            'invoice_preview',
            $this->buildInvoicePreview($patientTreatment, $isPaidLocked)
        );

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
            'agreed_amount' => ['nullable', 'numeric', 'min:0'],
            'agreed_amount_date' => ['nullable', 'date'],
        ]);

        // On permet la clôture même sans séance pour les cas de réorientation de diagnostic ou erreur de saisie.
        // On vérifie tout de même si on passe à 'completed' pour déclencher la facture.
        if (($validated['status'] ?? null) === 'completed' && $patientTreatment->status !== 'completed') {
            $existingInvoice = $patientTreatment->invoice()->exists();
            if (!$existingInvoice) {
                $this->createInvoiceForTreatment($patientTreatment);
            }
        }

        $patientTreatment->update($validated);

        // Mise à jour des actes associés si fournis
        if ($request->has('acts')) {
            if ($this->hasPaidInvoice($patientTreatment->id)) {
                return response()->json([
                    'message' => 'Modification impossible: la facture du traitement est deja payee.',
                ], 422);
            }

            $consultationSimple = $this->resolveConsultationSimpleAct();
            if (!$consultationSimple) {
                return response()->json([
                    'message' => 'Acte obligatoire introuvable: Consultation simple.',
                ], 422);
            }

            $acts = collect($validated['acts'] ?? []);
            $hasConsultation = $acts->contains(function ($act) use ($consultationSimple) {
                return (int) ($act['dental_act_id'] ?? 0) === (int) $consultationSimple->id;
            });

            if (!$hasConsultation) {
                $acts->prepend([
                    'dental_act_id' => $consultationSimple->id,
                    'quantity' => 1,
                ]);
            }

            // On supprime les anciens actes pour ce traitement
            $patientTreatment->acts()->delete();
            foreach ($acts as $act) {
                $dentalAct = DentalAct::find($act['dental_act_id']);
                if (!$dentalAct) {
                    continue;
                }

                $patientTreatment->acts()->create([
                    'dental_act_id' => $dentalAct->id,
                    'quantity' => $act['quantity'] ?? 1,
                    'tarif_snapshot' => $dentalAct->tarif,
                ]);
            }
        }

        $patientTreatment->load(['patient', 'nextAppointment', 'acts.dentalAct']);
        $isPaidLocked = $this->hasPaidInvoice($patientTreatment->id);
        $patientTreatment->setAttribute(
            'is_invoice_paid_locked',
            $isPaidLocked
        );
        $patientTreatment->setAttribute(
            'invoice_preview',
            $this->buildInvoicePreview($patientTreatment, $isPaidLocked)
        );
        return response()->json($patientTreatment);
    }

    /**
     * Ajouter des actes à un traitement existant
     */
    public function addActs(Request $request, PatientTreatment $patientTreatment)
    {
        if ($this->hasPaidInvoice($patientTreatment->id)) {
            return response()->json([
                'message' => 'Ajout impossible: la facture du traitement est deja payee.',
            ], 422);
        }

        $validated = $request->validate([
            'acts' => ['required', 'array'],
            'acts.*.dental_act_id' => ['required', 'integer', 'exists:dental_acts,id'],
            'acts.*.quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        // Ajouter les nouveaux actes sans supprimer les anciens
        $insertedActs = [];
        foreach ($validated['acts'] as $act) {
            $dentalAct = DentalAct::find($act['dental_act_id']);
            if (!$dentalAct) {
                continue;
            }

            $created = $patientTreatment->acts()->create([
                'dental_act_id' => $dentalAct->id,
                'quantity' => $act['quantity'] ?? 1,
                'tarif_snapshot' => $dentalAct->tarif,
            ]);

            $insertedActs[] = [
                'id' => $created->id,
                'dental_act_id' => $created->dental_act_id,
                'quantity' => $created->quantity,
                'tarif_snapshot' => $created->tarif_snapshot,
            ];
        }

        $patientTreatment->load(['patient', 'nextAppointment', 'acts.dentalAct']);
        $isPaidLocked = $this->hasPaidInvoice($patientTreatment->id);
        $patientTreatment->setAttribute(
            'is_invoice_paid_locked',
            $isPaidLocked
        );
        $patientTreatment->setAttribute(
            'invoice_preview',
            $this->buildInvoicePreview($patientTreatment, $isPaidLocked)
        );

        if (!empty($insertedActs)) {
            $this->logAudit(
                userId: $request->user()?->id,
                action: 'treatment_acts_added',
                tableName: 'patient_treatments',
                recordId: $patientTreatment->id,
                oldValues: null,
                newValues: ['acts' => $insertedActs],
                description: 'Ajout d\'actes au traitement.'
            );
        }

        return response()->json([
            'message' => 'Actes ajoutés avec succès',
            'patient_treatment' => $patientTreatment
        ]);
    }

    /**
     * Supprimer un acte du traitement.
     * Consultation simple est obligatoire et ne peut pas etre supprimee.
     */
    public function removeAct(Request $request, PatientTreatment $patientTreatment, PatientTreatmentAct $patientTreatmentAct)
    {
        $validated = $request->validate([
            'audit_note' => ['nullable', 'string'],
        ]);

        if ((int) $patientTreatmentAct->patient_treatment_id !== (int) $patientTreatment->id) {
            return response()->json([
                'message' => 'Acte introuvable pour ce traitement.',
            ], 404);
        }

        if ($this->hasPaidInvoice($patientTreatment->id)) {
            return response()->json([
                'message' => 'Suppression impossible: la facture du traitement est deja payee.',
            ], 422);
        }

        $consultationSimple = $this->resolveConsultationSimpleAct();
        if ($consultationSimple && (int) $patientTreatmentAct->dental_act_id === (int) $consultationSimple->id) {
            return response()->json([
                'message' => 'Suppression impossible: Consultation simple est obligatoire.',
            ], 422);
        }

        $deletedPayload = [
            'id' => $patientTreatmentAct->id,
            'patient_treatment_id' => $patientTreatmentAct->patient_treatment_id,
            'dental_act_id' => $patientTreatmentAct->dental_act_id,
            'quantity' => $patientTreatmentAct->quantity,
            'tarif_snapshot' => $patientTreatmentAct->tarif_snapshot,
        ];

        $patientTreatmentAct->delete();

        $this->logAudit(
            userId: $request->user()?->id,
            action: 'treatment_act_deleted',
            tableName: 'patient_treatment_acts',
            recordId: $deletedPayload['id'],
            oldValues: $deletedPayload,
            newValues: null,
            description: ($validated['audit_note'] ?? null) ?: 'Suppression d\'un acte du traitement.'
        );

        return response()->json([
            'message' => 'Acte supprime avec succes.',
        ]);
    }

    /**
     * Modifier un acte du traitement (quantite/tarif snapshot).
     */
    public function updateAct(Request $request, PatientTreatment $patientTreatment, PatientTreatmentAct $patientTreatmentAct)
    {
        if ((int) $patientTreatmentAct->patient_treatment_id !== (int) $patientTreatment->id) {
            return response()->json([
                'message' => 'Acte introuvable pour ce traitement.',
            ], 404);
        }

        if ($this->hasPaidInvoice($patientTreatment->id)) {
            return response()->json([
                'message' => 'Modification impossible: la facture du traitement est deja payee.',
            ], 422);
        }

        $consultationSimple = $this->resolveConsultationSimpleAct();
        if ($consultationSimple && (int) $patientTreatmentAct->dental_act_id === (int) $consultationSimple->id) {
            return response()->json([
                'message' => 'Modification impossible: Consultation simple est obligatoire.',
            ], 422);
        }

        $validated = $request->validate([
            'quantity' => ['sometimes', 'required', 'integer', 'min:1'],
            'tarif_snapshot' => ['sometimes', 'required', 'numeric', 'min:0'],
            'audit_note' => ['nullable', 'string'],
        ]);

        if (empty($validated)) {
            return response()->json([
                'message' => 'Aucune modification fournie.',
            ], 422);
        }

        // La colonne est en integer en base; on cast explicitement.
        if (array_key_exists('tarif_snapshot', $validated)) {
            $validated['tarif_snapshot'] = (int) round($validated['tarif_snapshot']);
        }

        $oldValues = [
            'quantity' => $patientTreatmentAct->quantity,
            'tarif_snapshot' => $patientTreatmentAct->tarif_snapshot,
        ];

        $auditNote = $validated['audit_note'] ?? null;
        unset($validated['audit_note']);

        $patientTreatmentAct->update($validated);

        $this->logAudit(
            userId: $request->user()?->id,
            action: 'treatment_act_updated',
            tableName: 'patient_treatment_acts',
            recordId: $patientTreatmentAct->id,
            oldValues: $oldValues,
            newValues: [
                'quantity' => $patientTreatmentAct->quantity,
                'tarif_snapshot' => $patientTreatmentAct->tarif_snapshot,
            ],
            description: $auditNote ?: 'Modification d\'un acte du traitement.'
        );

        return response()->json([
            'message' => 'Acte modifie avec succes.',
            'patient_treatment_act' => $patientTreatmentAct->fresh(['dentalAct']),
        ]);
    }

    private function resolveConsultationSimpleAct(): ?DentalAct
    {
        return DentalAct::query()
            ->whereRaw('LOWER(name) = ?', ['consultation simple'])
            ->orWhereRaw('LOWER(name) LIKE ?', ['%consultation simple%'])
            ->first();
    }

    private function hasPaidInvoice(int $patientTreatmentId): bool
    {
        return InvoiceItem::query()
            ->whereHas('invoice', function ($query) {
                $query->where('status', 'paid');
            })
            ->whereHas('patientTreatmentAct', function ($query) use ($patientTreatmentId) {
                $query->where('patient_treatment_id', $patientTreatmentId);
            })
            ->exists();
    }

    private function buildInvoicePreview(PatientTreatment $patientTreatment, bool $isPaidLocked): array
    {
        if (!$patientTreatment->relationLoaded('acts')) {
            $patientTreatment->load('acts');
        }

        $itemCount = (int) $patientTreatment->acts->count();
        $totalAmount = (float) $patientTreatment->acts->sum(function ($act) {
            $quantity = (int) ($act->quantity ?? 1);
            $unitPrice = (float) ($act->tarif_snapshot ?? 0);
            return $quantity * $unitPrice;
        });

        return [
            'status' => $isPaidLocked ? 'paid' : 'draft',
            'item_count' => $itemCount,
            'total_amount' => round($totalAmount, 2),
            'currency' => 'EUR',
        ];
    }

    private function logAudit(
        ?int $userId,
        string $action,
        ?string $tableName,
        ?int $recordId,
        mixed $oldValues,
        mixed $newValues,
        ?string $description
    ): void {
        DB::table('audit_logs')->insert([
            'user_id' => $userId,
            'action' => $action,
            'table_name' => $tableName,
            'record_id' => $recordId,
            'old_values' => $oldValues ? json_encode($oldValues) : null,
            'new_values' => $newValues ? json_encode($newValues) : null,
            'description' => $description,
            'created_at' => now(),
        ]);
    }

    /**
     * Auto-crée une facture cumulative pour un traitement complété
     */
    private function createInvoiceForTreatment(PatientTreatment $patientTreatment)
    {
        $acts = $patientTreatment->acts()->with('dentalAct')->get();
        if ($acts->isEmpty()) {
            return null;
        }

        $total = 0;
        foreach ($acts as $act) {
            $qty = (int) ($act->quantity ?? 1);
            $price = (float) ($act->tarif_snapshot ?? $act->dentalAct->tarif ?? 0);
            $total += ($qty * $price);
        }

        $invoice = \App\Models\Invoice::create([
            'patient_id' => $patientTreatment->patient_id,
            'patient_treatment_id' => $patientTreatment->id,
            'invoice_number' => 'TMP-' . uniqid('', true),
            'issue_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'total_amount' => $total,
            'paid_amount' => 0,
            'status' => 'pending',
            'notes' => "Facture cumulative pour traitement: {$patientTreatment->name}",
        ]);

        // Créer les items de facture depuis les actes du traitement
        foreach ($acts as $act) {
            $qty = (int) ($act->quantity ?? 1);
            $price = (float) ($act->tarif_snapshot ?? $act->dentalAct->tarif ?? 0);
            $subtotal = $qty * $price;

            $invoice->items()->create([
                'patient_treatment_act_id' => $act->id,
                'quantity' => $qty,
                'unit_price' => $price,
                'subtotal' => $subtotal,
            ]);
        }

        // Générer le numéro de facture définitif
        $invoice->update([
            'invoice_number' => sprintf('FAC-%s-%06d', date('Y'), $invoice->id),
        ]);

        return $invoice;
    }

    public function destroy(PatientTreatment $patientTreatment)
    {
        $patientTreatment->delete();

        return response()->noContent();
    }
}
