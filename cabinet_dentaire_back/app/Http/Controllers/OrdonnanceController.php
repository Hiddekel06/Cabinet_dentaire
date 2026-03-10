<?php

namespace App\Http\Controllers;

use App\Models\Ordonnance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;

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

    /**
     * Genere une ordonnance PDF depuis un template Word a variables.
     */
    public function generate(Request $request, Ordonnance $ordonnance)
    {
        $ordonnance->load(['patient', 'issuer', 'items.medication']);

        $templatePath = resource_path('template/template_ordonnance.docx');
        if (!file_exists($templatePath)) {
            $templatePath = resource_path('template/Template_Ordonnance.docx');
        }
        if (!file_exists($templatePath)) {
            return response()->json(['error' => 'Le modele Word ordonnance est introuvable.'], 500);
        }

        try {
            $templateProcessor = new \PhpOffice\PhpWord\TemplateProcessor($templatePath);

            $patientFullName = trim(($ordonnance->patient->first_name ?? '') . ' ' . ($ordonnance->patient->last_name ?? ''));

            // Variables de base standardisees pour la template.
            $templateProcessor->setValue('ordonnance_id', (string) $ordonnance->id);
            $templateProcessor->setValue('patient_full_name', $patientFullName);
            $templateProcessor->setValue('patient_first_name', (string) ($ordonnance->patient->first_name ?? ''));
            $templateProcessor->setValue('patient_last_name', (string) ($ordonnance->patient->last_name ?? ''));
            $templateProcessor->setValue('doctor_name', (string) ($ordonnance->issuer->name ?? ''));
            $templateProcessor->setValue('issue_date', (string) $ordonnance->issue_date);
            $templateProcessor->setValue('notes', (string) ($ordonnance->notes ?? ''));
            $templateProcessor->setValue('items_text', $this->buildItemsText($ordonnance));

            // Variables detaillees par ligne (optionnelles si la template utilise cloneRow).
            $itemsCount = $ordonnance->items->count();
            if ($itemsCount > 0) {
                try {
                    $templateProcessor->cloneRow('medication_name', $itemsCount);
                    foreach ($ordonnance->items as $index => $item) {
                        $i = $index + 1;
                        $templateProcessor->setValue("medication_name#{$i}", (string) $item->medication_name);
                        $templateProcessor->setValue("frequency#{$i}", (string) $item->frequency);
                        $templateProcessor->setValue("duration#{$i}", (string) ($item->duration ?? ''));
                        $templateProcessor->setValue("instructions#{$i}", (string) ($item->instructions ?? ''));
                    }
                } catch (\Throwable $e) {
                    // Si la template ne contient pas les placeholders cloneRow, on garde items_text.
                }
            }

            // Variables personnalisees optionnelles envoyees par le frontend.
            $customVariables = $request->input('variables', []);
            if (is_array($customVariables)) {
                foreach ($customVariables as $key => $value) {
                    if (is_string($key)) {
                        $templateProcessor->setValue($key, (string) ($value ?? ''));
                    }
                }
            }

            $baseName = 'ordonnance_' . $ordonnance->id . '_' . time();
            $outputWord = storage_path('app/' . $baseName . '.docx');
            $templateProcessor->saveAs($outputWord);

            // Conversion en PDF via LibreOffice (soffice)
            $outputPdf = storage_path('app/' . $baseName . '.pdf');
            $cmd = sprintf(
                'soffice --headless --convert-to pdf --outdir %s %s 2>&1',
                escapeshellarg(dirname($outputWord)),
                escapeshellarg($outputWord)
            );
            $result = [];
            $retval = null;
            exec($cmd, $result, $retval);

            if ($retval !== 0 || !file_exists($outputPdf)) {
                if (file_exists($outputWord)) {
                    File::delete($outputWord);
                }

                return response()->json([
                    'error' => 'Erreur lors de la conversion PDF.',
                    'details' => implode(PHP_EOL, $result),
                ], 500);
            }

            return response()->download($outputPdf)->deleteFileAfterSend(true);
        } catch (\Exception $e) {
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
}
