<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\PatientTreatmentAct;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    /**
     * Liste paginee des factures avec filtres basiques.
     */
    public function index(Request $request)
    {
        $query = Invoice::query()
            ->with(['patient:id,first_name,last_name,phone'])
            ->latest('issue_date');

        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->integer('patient_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('patient', function ($qp) use ($search) {
                        $qp->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('issue_date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('issue_date', '<=', $request->input('date_to'));
        }

        return response()->json($query->paginate(15));
    }

    /**
     * Detail complet d'une facture.
     */
    public function show(Invoice $invoice)
    {
        $invoice->load([
            'patient',
            'items.patientTreatmentAct.dentalAct',
            'items.patientTreatmentAct.patientTreatment',
        ]);

        return response()->json($invoice);
    }

    /**
     * Cree une facture depuis une liste d'actes realises (non encore factures).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:issue_date'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.patient_treatment_act_id' => ['required', 'integer', 'distinct', 'exists:patient_treatment_acts,id'],
        ]);

        $invoice = DB::transaction(function () use ($validated) {
            $actIds = collect($validated['items'])
                ->pluck('patient_treatment_act_id')
                ->unique()
                ->values();

            $acts = PatientTreatmentAct::query()
                ->with(['dentalAct:id,tarif', 'patientTreatment:id,patient_id'])
                ->whereIn('id', $actIds)
                ->lockForUpdate()
                ->get();

            if ($acts->count() !== $actIds->count()) {
                throw ValidationException::withMessages([
                    'items' => ['Un ou plusieurs actes sont introuvables.'],
                ]);
            }

            $invalidPatientAct = $acts->first(function (PatientTreatmentAct $act) use ($validated) {
                return (int) ($act->patientTreatment?->patient_id) !== (int) $validated['patient_id'];
            });

            if ($invalidPatientAct) {
                throw ValidationException::withMessages([
                    'items' => ['Des actes ne correspondent pas au patient selectionne.'],
                ]);
            }

            $alreadyInvoiced = DB::table('invoice_items')
                ->whereIn('patient_treatment_act_id', $actIds)
                ->exists();

            if ($alreadyInvoiced) {
                throw ValidationException::withMessages([
                    'items' => ['Un ou plusieurs actes sont deja factures.'],
                ]);
            }

            $invoice = Invoice::create([
                'patient_id' => $validated['patient_id'],
                'invoice_number' => 'TMP-' . uniqid('', true),
                'issue_date' => $validated['issue_date'],
                'due_date' => $validated['due_date'] ?? $validated['issue_date'],
                'total_amount' => 0,
                'paid_amount' => 0,
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);

            $total = 0;
            foreach ($acts as $act) {
                $quantity = (int) ($act->quantity ?? 1);
                $unitPrice = (float) ($act->tarif_snapshot ?? $act->dentalAct?->tarif ?? 0);
                $subtotal = $quantity * $unitPrice;

                $invoice->items()->create([
                    'patient_treatment_act_id' => $act->id,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                ]);

                $total += $subtotal;
            }

            $invoice->update([
                'invoice_number' => sprintf('FAC-%s-%06d', date('Y'), $invoice->id),
                'total_amount' => $total,
            ]);

            return $invoice->fresh(['patient', 'items.patientTreatmentAct.dentalAct']);
        });

        return response()->json($invoice, 201);
    }
}
