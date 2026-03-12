<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\PatientTreatmentAct;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

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

    /**
     * Genere un PDF de la facture a partir du template Word.
     */
    public function generate(Invoice $invoice)
    {
        $invoice->load([
            'patient',
            'items.patientTreatmentAct.dentalAct',
        ]);

        $templatePath = resource_path('template/template_facture.docx');
        if (!file_exists($templatePath)) {
            return response()->json(['error' => 'Le modele Word facture est introuvable.'], 500);
        }

        // Cache PDF: evite de reconvertir via LibreOffice tant que la facture n'a pas change.
        $itemsSignature = $invoice->items
            ->map(function ($item) {
                return implode(':', [
                    (string) $item->id,
                    (string) $item->quantity,
                    (string) $item->unit_price,
                    (string) $item->subtotal,
                    (string) ($item->updated_at?->timestamp ?? ''),
                ]);
            })
            ->implode('|');

        $versionKey = md5(implode('|', [
            (string) $invoice->invoice_number,
            (string) $invoice->issue_date,
            (string) ($invoice->due_date ?? ''),
            (string) $invoice->total_amount,
            (string) $invoice->paid_amount,
            (string) ($invoice->updated_at?->timestamp ?? ''),
            $itemsSignature,
        ]));

        $cacheDir = storage_path('app/generated/invoices');
        File::ensureDirectoryExists($cacheDir);
        $cachedPdfPath = $cacheDir . DIRECTORY_SEPARATOR . 'facture_' . $invoice->id . '_' . $versionKey . '.pdf';

        if (file_exists($cachedPdfPath)) {
            return response()->download($cachedPdfPath, 'facture_' . $invoice->invoice_number . '.pdf');
        }

        try {
            $templateProcessor = new \PhpOffice\PhpWord\TemplateProcessor($templatePath);

            $patientName = trim(
                ($invoice->patient->first_name ?? '') . ' ' . ($invoice->patient->last_name ?? '')
            );
            $patientPhone = (string) ($invoice->patient->phone ?? '');
            $issueDate    = (string) $invoice->issue_date;
            $dueDate      = (string) ($invoice->due_date ?? $issueDate);
            $resteAPayer  = (float) $invoice->total_amount - (float) $invoice->paid_amount;

            // Variables globales (en-tete + section patient)
            $templateProcessor->setValue('adresse cabinet',   (string) config('app.cabinet_address', ''));
            $templateProcessor->setValue('telephone cabinet', (string) config('app.cabinet_phone', ''));
            $templateProcessor->setValue('numero facture',    (string) $invoice->invoice_number);
            $templateProcessor->setValue('date facture',      $issueDate);
            $templateProcessor->setValue('date echeance',     $dueDate);
            $templateProcessor->setValue('nom patient',       $patientName);
            $templateProcessor->setValue('téléphone patient', $patientPhone);

            // Totaux
            $templateProcessor->setValue('total',         number_format((float) $invoice->total_amount, 2, '.', ' '));
            $templateProcessor->setValue('montant paye',  number_format((float) $invoice->paid_amount, 2, '.', ' '));
            $templateProcessor->setValue('reste a payer', number_format($resteAPayer, 2, '.', ' '));

            // Lignes d'actes (cloneRow)
            $items      = $invoice->items;
            $itemsCount = $items->count();

            if ($itemsCount > 0) {
                try {
                    $templateProcessor->cloneRow('nom acte', $itemsCount);
                    foreach ($items as $index => $item) {
                        $i      = $index + 1;
                        $dental = $item->patientTreatmentAct?->dentalAct;
                        $templateProcessor->setValue("nom patient#{$i}",  $patientName);
                        $templateProcessor->setValue("date facture#{$i}", $issueDate);
                        $templateProcessor->setValue("nom acte#{$i}",     (string) ($dental?->name ?? 'Acte'));
                        $templateProcessor->setValue("indice#{$i}",       (string) ($dental?->code ?? ''));
                        $templateProcessor->setValue("montant#{$i}",      number_format((float) $item->subtotal, 2, '.', ' '));
                    }
                } catch (\Throwable $e) {
                    // Template sans placeholder cloneRow, on continue.
                }
            }

            $tmpDir = storage_path('app/generated/tmp');
            File::ensureDirectoryExists($tmpDir);

            $baseName   = 'facture_' . $invoice->id . '_' . time();
            $outputWord = $tmpDir . DIRECTORY_SEPARATOR . $baseName . '.docx';
            $templateProcessor->saveAs($outputWord);

            $outputPdf = $tmpDir . DIRECTORY_SEPARATOR . $baseName . '.pdf';
            $cmd = sprintf(
                'soffice --headless --invisible --nodefault --nolockcheck --nologo --norestore --convert-to pdf --outdir %s %s 2>&1',
                escapeshellarg($tmpDir),
                escapeshellarg($outputWord)
            );

            $start = microtime(true);
            $result = [];
            $retval = null;
            exec($cmd, $result, $retval);
            $durationMs = (int) round((microtime(true) - $start) * 1000);
            Log::info('Invoice PDF generation timing', [
                'invoice_id' => $invoice->id,
                'duration_ms' => $durationMs,
                'retval' => $retval,
            ]);

            if (file_exists($outputWord)) {
                File::delete($outputWord);
            }

            if ($retval !== 0 || !file_exists($outputPdf)) {
                return response()->json([
                    'error'   => 'Erreur lors de la conversion PDF.',
                    'details' => implode(PHP_EOL, $result),
                ], 500);
            }

            // Remplace les anciennes versions en cache de cette facture.
            foreach (File::glob($cacheDir . DIRECTORY_SEPARATOR . 'facture_' . $invoice->id . '_*.pdf') as $oldCacheFile) {
                if ($oldCacheFile !== $cachedPdfPath) {
                    File::delete($oldCacheFile);
                }
            }

            File::move($outputPdf, $cachedPdfPath);

            return response()->download($cachedPdfPath, 'facture_' . $invoice->invoice_number . '.pdf');
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors de la generation de la facture : ' . $e->getMessage(),
            ], 500);
        }
    }
}
