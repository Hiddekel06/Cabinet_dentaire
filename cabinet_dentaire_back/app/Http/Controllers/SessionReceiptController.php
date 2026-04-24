<?php

namespace App\Http\Controllers;

use App\Models\DentalAct;
use App\Models\MedicalRecord;
use App\Models\SessionReceipt;
use App\Models\SessionReceiptEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Mpdf\Mpdf;
use Throwable;

class SessionReceiptController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(1, min(200, (int) $request->input('per_page', 15)));

        $query = SessionReceipt::query()
            ->with(['patient:id,first_name,last_name', 'medicalRecord:id,date,patient_treatment_id'])
            ->withCount([
                'events as downloads_count' => function ($eventQuery) {
                    $eventQuery->where('event_type', 'downloaded');
                },
            ])
            ->addSelect([
                'last_downloaded_at' => SessionReceiptEvent::query()
                    ->selectRaw('MAX(created_at)')
                    ->whereColumn('session_receipt_id', 'session_receipts.id')
                    ->where('event_type', 'downloaded'),
            ])
            ->latest('issue_date');

        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->integer('patient_id'));
        }

        if ($request->filled('patient_treatment_id')) {
            $query->where('patient_treatment_id', $request->integer('patient_treatment_id'));
        }

        if ($request->filled('medical_record_id')) {
            $query->where('medical_record_id', $request->integer('medical_record_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'medical_record_id' => ['required', 'integer', 'exists:medical_records,id'],
            'acts' => ['required', 'array', 'min:1'],
            'acts.*.dental_act_id' => ['required', 'integer', 'distinct', 'exists:dental_acts,id'],
            'acts.*.quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        $existing = SessionReceipt::with(['items.dentalAct', 'patient', 'medicalRecord'])
            ->where('medical_record_id', $validated['medical_record_id'])
            ->first();

        if ($existing) {
            return response()->json($existing);
        }

        $medicalRecord = MedicalRecord::with(['patient', 'patientTreatment'])->findOrFail($validated['medical_record_id']);

        $actIds = collect($validated['acts'])->pluck('dental_act_id')->unique()->values();
        $acts = DentalAct::query()->whereIn('id', $actIds)->get()->keyBy('id');

        if ($acts->count() !== $actIds->count()) {
            return response()->json([
                'message' => 'Un ou plusieurs actes sont introuvables.',
            ], 422);
        }

        $receipt = DB::transaction(function () use ($validated, $medicalRecord, $acts, $request) {
            $receipt = SessionReceipt::create([
                'medical_record_id' => $medicalRecord->id,
                'patient_id' => $medicalRecord->patient_id,
                'patient_treatment_id' => $medicalRecord->patient_treatment_id,
                'receipt_number' => 'TMP-' . uniqid('', true),
                'issue_date' => now()->toDateString(),
                'total_amount' => 0,
                'status' => 'pending',
                'paid_at' => null,
            ]);

            $total = 0;
            foreach ($validated['acts'] as $item) {
                $dentalAct = $acts->get((int) $item['dental_act_id']);
                if (!$dentalAct) {
                    continue;
                }

                $quantity = max(1, (int) ($item['quantity'] ?? 1));
                $unitPrice = (float) ($dentalAct->tarif ?? 0);
                $lineTotal = $quantity * $unitPrice;

                $receipt->items()->create([
                    'dental_act_id' => $dentalAct->id,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                ]);

                $total += $lineTotal;
            }

            $receipt->update([
                'receipt_number' => sprintf('REC-%s-%06d', date('Y'), $receipt->id),
                'total_amount' => $total,
            ]);

            $this->logReceiptEvent(
                $receipt,
                'created',
                $request->user()?->id,
                [
                    'medical_record_id' => $receipt->medical_record_id,
                    'patient_treatment_id' => $receipt->patient_treatment_id,
                ]
            );

            return $receipt;
        });

        $receipt->load(['items.dentalAct', 'patient', 'medicalRecord'])
            ->loadCount([
                'events as downloads_count' => function ($eventQuery) {
                    $eventQuery->where('event_type', 'downloaded');
                },
            ]);

        $receipt->setAttribute(
            'last_downloaded_at',
            $receipt->events()->where('event_type', 'downloaded')->max('created_at')
        );

        return response()->json($receipt, 201);
    }

    public function show(SessionReceipt $sessionReceipt)
    {
        $sessionReceipt->load([
            'items.dentalAct',
            'patient',
            'medicalRecord',
            'patientTreatment',
            'events' => function ($query) {
                $query->with('user:id,name,email')
                    ->latest('created_at')
                    ->limit(30);
            },
        ]);

        $sessionReceipt->setAttribute(
            'downloads_count',
            $sessionReceipt->events()->where('event_type', 'downloaded')->count()
        );

        $sessionReceipt->setAttribute(
            'last_downloaded_at',
            $sessionReceipt->events()->where('event_type', 'downloaded')->max('created_at')
        );

        return response()->json($sessionReceipt);
    }

    public function generate(Request $request, SessionReceipt $sessionReceipt)
    {
        $sessionReceipt->load(['items.dentalAct', 'patient', 'medicalRecord', 'patientTreatment']);

        $html = view('pdf.session_receipt', [
            'receipt' => $sessionReceipt,
            'cabinetName' => $this->normalizeCabinetName((string) config('app.cabinet_name', 'MATLABUL SHIFAH')),
            'cabinetAddress' => (string) config('app.cabinet_address', ''),
            'cabinetPhone' => (string) config('app.cabinet_phone', ''),
            'logoDataUri' => $this->fileToDataUri(public_path('images/logoCabinet.png')),
            'patientName' => trim(($sessionReceipt->patient?->first_name ?? '') . ' ' . ($sessionReceipt->patient?->last_name ?? '')),
        ])->render();

        $tempDir = storage_path('app/mpdf');
        File::ensureDirectoryExists($tempDir);

        $mpdf = new Mpdf([
            'format' => 'A4',
            'orientation' => 'P',
            'tempDir' => $tempDir,
            'margin_left' => 10,
            'margin_right' => 10,
            'margin_top' => 10,
            'margin_bottom' => 10,
            'default_font' => 'dejavusans',
            'default_font_size' => 10,
        ]);

        $mpdf->SetTitle('Recu de seance ' . $sessionReceipt->receipt_number);
        $mpdf->SetAuthor((string) config('app.cabinet_name', 'MATLABUL SHIFAH'));
        $mpdf->SetSubject('Recu de seance');
        $mpdf->WriteHTML($html);

        $pdfBinary = $mpdf->Output('', 'S');

        $this->logReceiptEvent(
            $sessionReceipt,
            'downloaded',
            $request->user()?->id,
            [
                'ip' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
            ]
        );

        return response($pdfBinary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="recu_seance_' . $sessionReceipt->receipt_number . '.pdf"',
        ]);
    }

    public function markAsPaid(Request $request, SessionReceipt $sessionReceipt)
    {
        if ($sessionReceipt->status === 'paid') {
            $sessionReceipt->load(['items.dentalAct', 'patient', 'medicalRecord', 'patientTreatment']);
            return response()->json($sessionReceipt);
        }

        $sessionReceipt->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $this->logReceiptEvent(
            $sessionReceipt,
            'paid',
            $request->user()?->id,
            [
                'ip' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
            ]
        );

        $sessionReceipt->load([
            'items.dentalAct',
            'patient',
            'medicalRecord',
            'patientTreatment',
            'events' => function ($query) {
                $query->with('user:id,name,email')
                    ->latest('created_at')
                    ->limit(30);
            },
        ]);

        $sessionReceipt->setAttribute(
            'downloads_count',
            $sessionReceipt->events()->where('event_type', 'downloaded')->count()
        );

        $sessionReceipt->setAttribute(
            'last_downloaded_at',
            $sessionReceipt->events()->where('event_type', 'downloaded')->max('created_at')
        );

        return response()->json($sessionReceipt);
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

    private function logReceiptEvent(SessionReceipt $receipt, string $eventType, ?int $userId = null, array $metadata = []): void
    {
        try {
            SessionReceiptEvent::create([
                'session_receipt_id' => $receipt->id,
                'user_id' => $userId,
                'event_type' => $eventType,
                'metadata' => $metadata,
            ]);
        } catch (Throwable) {
            // Avoid breaking receipt generation/download when event logging fails.
        }
    }
}
