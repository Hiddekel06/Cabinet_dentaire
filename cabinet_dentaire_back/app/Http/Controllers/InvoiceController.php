<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\PatientTreatmentAct;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Mpdf\Mpdf;
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
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
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

            // Verifier que les traitements associes n'ont pas deja une facture
            $treatmentIds = $acts->pluck('patient_treatment_id')->unique()->filter();
            if ($treatmentIds->isNotEmpty()) {
                $treatmentsWithInvoice = DB::table('invoices')
                    ->whereIn('patient_treatment_id', $treatmentIds)
                    ->where('status', '!=', 'cancelled')
                    ->pluck('patient_treatment_id')
                    ->toArray();

                if (!empty($treatmentsWithInvoice)) {
                    throw ValidationException::withMessages([
                        'items' => ['Un ou plusieurs traitements ont deja une facture associee.'],
                    ]);
                }
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
            $itemsByAct = collect($validated['items'])->keyBy('patient_treatment_act_id');
            foreach ($acts as $act) {
                $quantity = (int) ($act->quantity ?? 1);
                $provided = $itemsByAct->get($act->id) ?? [];
                $unitPrice = isset($provided['unit_price']) ? (float) $provided['unit_price'] : (float) ($act->tarif_snapshot ?? $act->dentalAct?->tarif ?? 0);
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
     * Valide une facture comme totalement payee.
     */
    public function markAsPaid(Invoice $invoice)
    {
        if ($invoice->status === 'paid' && (float) $invoice->paid_amount >= (float) $invoice->total_amount) {
            $invoice->load(['patient', 'items.patientTreatmentAct.dentalAct']);
            return response()->json($invoice);
        }

        $invoice->update([
            'paid_amount' => $invoice->total_amount,
            'status' => 'paid',
        ]);

        $invoice->load(['patient', 'items.patientTreatmentAct.dentalAct']);
        return response()->json($invoice);
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

        $isDraft = $invoice->status !== 'paid';

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

        $templateVersion = $this->resolveInvoiceTemplateVersion();

        $versionKey = md5(implode('|', [
            (string) $invoice->invoice_number,
            (string) $invoice->status,
            (string) $invoice->issue_date,
            (string) ($invoice->due_date ?? ''),
            (string) $invoice->total_amount,
            (string) $invoice->paid_amount,
            (string) ($invoice->updated_at?->timestamp ?? ''),
            $itemsSignature,
            $templateVersion,
        ]));

        $cacheDir = storage_path('app/generated/invoices');
        File::ensureDirectoryExists($cacheDir);
        $cachedPdfPath = $cacheDir . DIRECTORY_SEPARATOR . 'facture_' . $invoice->id . '_' . $versionKey . '.pdf';

        if (file_exists($cachedPdfPath)) {
            $downloadName = ($isDraft ? 'brouillon_' : 'facture_') . $invoice->invoice_number . '.pdf';
            return response()->download($cachedPdfPath, $downloadName);
        }

        try {
            $pdfData = $this->buildInvoicePdfData($invoice, $isDraft);
            $html = view('pdf.invoice', $pdfData)->render();

            $tempDir = storage_path('app/mpdf');
            File::ensureDirectoryExists($tempDir);

            $tmpPdfDir = storage_path('app/generated/tmp');
            File::ensureDirectoryExists($tmpPdfDir);
            $tmpPdfPath = $tmpPdfDir . DIRECTORY_SEPARATOR . 'facture_' . $invoice->id . '_' . time() . '.pdf';
            $mpdf = new Mpdf([
                'format' => 'A4',
                'orientation' => 'P',
                'tempDir' => $tempDir,
                'margin_left' => 10,
                'margin_right' => 10,
                'margin_top' => 10,
                'margin_bottom' => 10,
                'margin_header' => 4,
                'margin_footer' => 4,
                'default_font' => 'dejavusans',
                'default_font_size' => 10,
            ]);

            $mpdf->SetTitle('Facture ' . $invoice->invoice_number);
            $mpdf->SetAuthor(config('app.cabinet_name', 'MATLABUL SHIFAH'));
            $mpdf->SetSubject('Facture cabinet dentaire');
            $mpdf->WriteHTML($html);
            $mpdf->Output($tmpPdfPath, 'F');

            foreach (File::glob($cacheDir . DIRECTORY_SEPARATOR . 'facture_' . $invoice->id . '_*.pdf') as $oldCacheFile) {
                if ($oldCacheFile !== $cachedPdfPath) {
                    File::delete($oldCacheFile);
                }
            }

            if (file_exists($cachedPdfPath)) {
                File::delete($cachedPdfPath);
            }

            File::move($tmpPdfPath, $cachedPdfPath);

            $downloadName = ($isDraft ? 'brouillon_' : 'facture_') . $invoice->invoice_number . '.pdf';
            return response()->download($cachedPdfPath, $downloadName);
        } catch (\Throwable $e) {
            Log::error('Invoice PDF generation failed', [
                'invoice_id' => $invoice->id,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Erreur lors de la generation de la facture : ' . $e->getMessage(),
            ], 500);
        }
    }

    private function buildInvoicePdfData(Invoice $invoice, bool $isDraft): array
    {
        $patientName = trim(
            (string) ($invoice->patient->first_name ?? '') . ' ' . (string) ($invoice->patient->last_name ?? '')
        );

        $items = $invoice->items->map(function ($item) use ($patientName, $invoice) {
            $dentalAct = $item->patientTreatmentAct?->dentalAct;

            return [
                'patient_name' => $patientName,
                'date' => (string) $invoice->issue_date,
                'acte' => (string) ($dentalAct?->name ?? 'Acte'),
                'indice' => (string) ($dentalAct?->code ?? ''),
                'montant' => (float) $item->subtotal,
            ];
        })->values()->all();

        return [
            'cabinetName' => $this->normalizeCabinetName(
                (string) config('app.cabinet_name', 'MATLABUL SHIFAH')
            ),
            'cabinetAddress' => (string) config('app.cabinet_address', ''),
            'cabinetPhone' => (string) config('app.cabinet_phone', ''),
            'logoDataUri' => $this->fileToDataUri(public_path('images/logoCabinet.png')),
            'invoiceNumber' => $isDraft
                ? ('BROUILLON - ' . (string) $invoice->invoice_number)
                : (string) $invoice->invoice_number,
            'issueDate' => (string) $invoice->issue_date,
            'dueDate' => (string) ($invoice->due_date ?? $invoice->issue_date),
            'patientName' => $patientName,
            'patientPhone' => (string) ($invoice->patient->phone ?? ''),
            'items' => $items,
            'totalAmount' => (float) $invoice->total_amount,
            'paidAmount' => (float) $invoice->paid_amount,
            'remainingAmount' => max((float) $invoice->total_amount - (float) $invoice->paid_amount, 0),
        ];
    }

    private function resolveInvoiceTemplateVersion(): string
    {
        $templatePath = resource_path('views/pdf/invoice.blade.php');
        $logoPath = public_path('images/logoCabinet.png');

        $templateHash = file_exists($templatePath) ? md5_file($templatePath) : 'no-template';
        $logoHash = file_exists($logoPath) ? md5_file($logoPath) : 'no-logo';

        return $templateHash . ':' . $logoHash;
    }

    private function normalizeCabinetName(string $name): string
    {
        $normalized = trim(str_replace('_', ' ', $name));

        return $normalized !== '' ? $normalized : 'MATLABUL SHIFAH';
    }

    private function fileToDataUri(string $path): ?string
    {
        if (!file_exists($path)) {
            return null;
        }

        $content = file_get_contents($path);
        if ($content === false) {
            return null;
        }

        $mime = mime_content_type($path) ?: 'image/png';

        return 'data:' . $mime . ';base64,' . base64_encode($content);
    }
}
