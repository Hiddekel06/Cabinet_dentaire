<?php

namespace App\Http\Controllers;

use App\Models\Ordonnance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Mpdf\Mpdf;

class OrdonnanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Ordonnance::with(['patient', 'issuer', 'items.medication'])->latest('issue_date');

        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->integer('patient_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('issue_date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('issue_date', '<=', $request->input('date_to'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->whereHas('patient', function ($qp) use ($search) {
                    $qp->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                })->orWhereHas('items', function ($qi) use ($search) {
                    $qi->where('medication_name', 'like', "%{$search}%")
                        ->orWhere('instructions', 'like', "%{$search}%");
                })->orWhere('notes', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'issue_date' => ['required', 'date'],
            'medical_record_id' => ['nullable', 'integer', 'exists:medical_records,id'],
            'patient_treatment_id' => ['nullable', 'integer', 'exists:patient_treatments,id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.medication_id' => ['nullable', 'integer', 'exists:medications,id'],
            'items.*.medication_name' => ['required', 'string', 'max:150'],
            'items.*.frequency' => ['required', 'string', 'max:100'],
            'items.*.duration' => ['nullable', 'string', 'max:100'],
            'items.*.instructions' => ['nullable', 'string'],
        ]);

        $ordonnance = DB::transaction(function () use ($validated, $request) {
            $ordonnance = Ordonnance::create([
                'patient_id' => $validated['patient_id'],
                'issued_by' => $request->user()->id,
                'issue_date' => $validated['issue_date'],
                'medical_record_id' => $validated['medical_record_id'] ?? null,
                'patient_treatment_id' => $validated['patient_treatment_id'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $ordonnance->items()->create([
                    'medication_id' => $item['medication_id'] ?? null,
                    'medication_name' => $item['medication_name'],
                    'frequency' => $item['frequency'],
                    'duration' => $item['duration'] ?? null,
                    'instructions' => $item['instructions'] ?? null,
                ]);
            }

            return $ordonnance;
        });

        $ordonnance->load(['patient', 'issuer', 'items.medication']);

        return response()->json($ordonnance, 201);
    }

    public function show(Ordonnance $ordonnance)
    {
        $ordonnance->load(['patient', 'issuer', 'items.medication']);

        return response()->json($ordonnance);
    }

    public function generate(Request $request, Ordonnance $ordonnance)
    {
        $ordonnance->load(['patient', 'issuer', 'items.medication']);

        try {
            $customVariables = $request->input('variables', []);

            if (!is_array($customVariables)) {
                $customVariables = [];
            }

            $itemsSignature = $ordonnance->items
                ->map(function ($item) {
                    return implode(':', [
                        (string) $item->id,
                        (string) $item->medication_name,
                        (string) $item->frequency,
                        (string) ($item->duration ?? ''),
                        (string) ($item->instructions ?? ''),
                        (string) ($item->updated_at?->timestamp ?? ''),
                    ]);
                })
                ->implode('|');

            $templateVersion = $this->resolveOrdonnanceTemplateVersion();
            $customVariablesHash = md5(json_encode($customVariables, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}');

            $versionKey = md5(implode('|', [
                (string) $ordonnance->id,
                (string) $ordonnance->issue_date,
                (string) ($ordonnance->updated_at?->timestamp ?? ''),
                (string) ($ordonnance->notes ?? ''),
                $itemsSignature,
                $templateVersion,
                $customVariablesHash,
            ]));

            $cacheDir = storage_path('app/generated/ordonnances');
            File::ensureDirectoryExists($cacheDir);
            $cachedPdfPath = $cacheDir . DIRECTORY_SEPARATOR . 'ordonnance_' . $ordonnance->id . '_' . $versionKey . '.pdf';

            if (file_exists($cachedPdfPath)) {
                return response()->download($cachedPdfPath, 'ordonnance_' . $ordonnance->id . '.pdf');
            }

            $pdfData = $this->buildOrdonnancePdfData($ordonnance, $customVariables);
            $html = view('pdf.ordonnance', $pdfData)->render();

            $tempDir = storage_path('app/mpdf');
            File::ensureDirectoryExists($tempDir);

            $tmpPdfDir = storage_path('app/generated/tmp');
            File::ensureDirectoryExists($tmpPdfDir);
            $tmpPdfPath = $tmpPdfDir . DIRECTORY_SEPARATOR . 'ordonnance_' . $ordonnance->id . '_' . time() . '.pdf';

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

            $mpdf->SetTitle('Ordonnance ' . $ordonnance->id);
            $mpdf->SetAuthor((string) ($ordonnance->issuer->name ?? '')); 
            $mpdf->SetSubject('Ordonnance cabinet dentaire');
            $mpdf->WriteHTML($html);
            $mpdf->Output($tmpPdfPath, 'F');

            foreach (File::glob($cacheDir . DIRECTORY_SEPARATOR . 'ordonnance_' . $ordonnance->id . '_*.pdf') as $oldCacheFile) {
                if ($oldCacheFile !== $cachedPdfPath) {
                    File::delete($oldCacheFile);
                }
            }

            if (file_exists($cachedPdfPath)) {
                File::delete($cachedPdfPath);
            }

            File::move($tmpPdfPath, $cachedPdfPath);

            return response()->download($cachedPdfPath, 'ordonnance_' . $ordonnance->id . '.pdf');
        } catch (\Throwable $e) {
            Log::error('Ordonnance PDF generation failed', [
                'ordonnance_id' => $ordonnance->id,
                'message' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Erreur lors de la generation de l\'ordonnance : ' . $e->getMessage()], 500);
        }
    }

    public function destroy(Ordonnance $ordonnance)
    {
        $ordonnance->delete();

        return response()->noContent();
    }

    private function buildItemsText(Ordonnance $ordonnance): string
    {
        if ($ordonnance->items->isEmpty()) {
            return '';
        }

        return $ordonnance->items
            ->map(function ($item, $index) {
                $line = ($index + 1) . '. ' . $item->medication_name . ' - ' . $item->frequency;
                if (!empty($item->duration)) {
                    $line .= ' - ' . $item->duration;
                }
                if (!empty($item->instructions)) {
                    $line .= ' - ' . $item->instructions;
                }
                return $line;
            })
            ->implode("\n");
    }

    private function buildOrdonnancePdfData(Ordonnance $ordonnance, array $customVariables): array
    {
        $patientFirstName = (string) ($ordonnance->patient->first_name ?? '');
        $patientLastName = (string) ($ordonnance->patient->last_name ?? '');
        $patientFullName = trim($patientFirstName . ' ' . $patientLastName);

        $items = $ordonnance->items->map(function ($item) {
            return [
                'medication_name' => (string) $item->medication_name,
                'frequency' => (string) $item->frequency,
                'duration' => (string) ($item->duration ?? ''),
                'instructions' => (string) ($item->instructions ?? ''),
            ];
        })->values()->all();

        $defaultDoctorName = (string) ($ordonnance->issuer->name ?? '');

        return [
            'cabinetName' => $this->normalizeCabinetName((string) config('app.cabinet_name', 'MATLABUL SHIFAH')),
            'cabinetAddress' => (string) config('app.cabinet_address', ''),
            'cabinetPhone' => (string) config('app.cabinet_phone', ''),
            'logoDataUri' => $this->fileToDataUri(public_path('images/logoCabinet.png')),
            'ordonnanceId' => (int) $ordonnance->id,
            'issueDate' => (string) $ordonnance->issue_date,
            'patientFirstName' => (string) ($customVariables['patient_first_name'] ?? $patientFirstName),
            'patientLastName' => (string) ($customVariables['patient_last_name'] ?? $patientLastName),
            'patientFullName' => (string) ($customVariables['patient_full_name'] ?? $patientFullName),
            'doctorName' => (string) ($customVariables['doctor_name'] ?? $defaultDoctorName),
            'notes' => (string) ($customVariables['notes'] ?? ($ordonnance->notes ?? '')),
            'itemsText' => (string) ($customVariables['items_text'] ?? $this->buildItemsText($ordonnance)),
            'items' => $items,
        ];
    }

    private function resolveOrdonnanceTemplateVersion(): string
    {
        $templatePath = resource_path('views/pdf/ordonnance.blade.php');
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
