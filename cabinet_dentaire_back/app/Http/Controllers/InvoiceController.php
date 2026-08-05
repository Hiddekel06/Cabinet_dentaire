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
use Illuminate\Support\Facades\Storage;
use App\Models\Setting;

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
        $invoice->load(['patient', 'items']);
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
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.dent' => ['nullable', 'integer'],
            'items.*.treatment_name' => ['required', 'string', 'max:255'],
            'items.*.indice' => ['nullable', 'string', 'max:255'],
            'items.*.amount' => ['required', 'numeric', 'min:0'],
        ]);

        $invoice = DB::transaction(function () use ($validated) {
            $invoice = Invoice::create([
                'patient_id' => $validated['patient_id'],
                'invoice_number' => 'TMP-' . uniqid('', true),
                'issue_date' => $validated['issue_date'],
                'due_date' => $validated['issue_date'],
                'total_amount' => 0,
                'paid_amount' => 0, 
                'status' => 'paid',
                'notes' => $validated['notes'] ?? null,
            ]);

            $total = 0;
            foreach ($validated['items'] as $item) {
                $amount = (float) $item['amount'];
                
                $invoice->items()->create([
                    'dent' => $item['dent'] ?? null,
                    'treatment_name' => $item['treatment_name'],
                    'indice' => $item['indice'] ?? null,
                    'unit_price' => $amount,
                    'quantity' => 1,
                    'subtotal' => $amount,
                ]);

                $total += $amount;
            }

            $invoice->update([
                'invoice_number' => sprintf('REL-%s-%06d', date('Y'), $invoice->id),
                'total_amount' => $total,
                'paid_amount' => $total,
            ]);

            return $invoice->fresh(['patient', 'items']);
        });

        return response()->json($invoice, 201);
    }

    /**
     * Valide une facture comme totalement payee.
     */
    public function markAsPaid(Invoice $invoice)
    {
        $invoice->update([
            'paid_amount' => $invoice->total_amount,
            'status' => 'paid',
        ]);

        $invoice->load(['patient', 'items']);
        return response()->json($invoice);
    }

    /**
     * Genere un PDF de la facture a partir du template Word.
     */
    public function generate(Invoice $invoice)
    {
        $invoice->load(['patient', 'items']);

        $isDraft = $invoice->status !== 'paid';

        $itemsSignature = $invoice->items
            ->map(function ($item) {
                return implode(':', [
                    (string) $item->id,
                    (string) $item->dent,
                    (string) $item->treatment_name,
                    (string) $item->indice,
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
            $downloadName = 'relevé_' . $invoice->invoice_number . '.pdf';
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

            $mpdf->SetTitle('Relevé ' . $invoice->invoice_number);
            $mpdf->SetAuthor(config('app.cabinet_name', 'Matlabul Shifah'));
            $mpdf->SetSubject('Relevé de soins cabinet dentaire');
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

            $downloadName = 'relevé_' . $invoice->invoice_number . '.pdf';
            return response()->download($cachedPdfPath, $downloadName);
        } catch (\Throwable $e) {
            Log::error('Invoice PDF generation failed', [
                'invoice_id' => $invoice->id,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Erreur lors de la generation du relevé : ' . $e->getMessage(),
            ], 500);
        }
    }

    private function buildInvoicePdfData(Invoice $invoice, bool $isDraft): array
    {
        $patientName = trim(
            (string) ($invoice->patient->first_name ?? '') . ' ' . (string) ($invoice->patient->last_name ?? '')
        );

        $items = $invoice->items->map(function ($item) use ($patientName, $invoice) {
            return [
                'patient_name' => $patientName,
                'date' => (string) $invoice->issue_date,
                'dent' => (string) ($item->dent ?? ''),
                'acte' => (string) ($item->treatment_name ?? 'Soin'),
                'indice' => (string) ($item->indice ?? ''),
                'montant' => (float) $item->subtotal,
            ];
        })->values()->all();

        $logoPath = Setting::getValue('cabinet_logo');
        $logoDataUri = ($logoPath && Storage::disk('public')->exists($logoPath))
            ? $this->fileToDataUri(Storage::disk('public')->path($logoPath))
            : $this->fileToDataUri(public_path('images/logoCabinet.png'));

        return [
            'cabinetName' => $this->normalizeCabinetName((string) Setting::getValue('cabinet_name')),
            'cabinetAddress' => (string) (Setting::getValue('cabinet_address') ?? ''),
            'cabinetPhone' => (string) (Setting::getValue('cabinet_phone') ?? ''),
            'logoDataUri' => $logoDataUri,
            'invoiceNumber' => $invoice->invoice_number,
            'issueDate' => (string) $invoice->issue_date,
            'dueDate' => (string) $invoice->issue_date,
            'patientName' => $patientName,
            'patientPhone' => (string) ($invoice->patient->phone ?? ''),
            'items' => $items,
            'totalAmount' => (float) $invoice->total_amount,
            'paidAmount' => (float) $invoice->paid_amount,
            'remainingAmount' => 0,
        ];
    }

    private function resolveInvoiceTemplateVersion(): string
    {
        $templatePath = resource_path('views/pdf/invoice.blade.php');
        $logoSetting = Setting::getValue('cabinet_logo');
        $logoPath = ($logoSetting && Storage::disk('public')->exists($logoSetting))
            ? Storage::disk('public')->path($logoSetting)
            : public_path('images/logoCabinet.png');

        $templateHash = file_exists($templatePath) ? md5_file($templatePath) : 'no-template';
        $logoHash = file_exists($logoPath) ? md5_file($logoPath) : 'no-logo';
        $settingsHash = md5((string) Setting::getValue('cabinet_name') . (string) Setting::getValue('cabinet_address') . (string) Setting::getValue('cabinet_phone'));

        return $templateHash . ':' . $logoHash . ':' . $settingsHash;
    }

    private function normalizeCabinetName(string $name): string
    {
        $normalized = trim(str_replace('_', ' ', $name));

        return $normalized !== '' ? $normalized : 'Matlabul Shifah';
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
