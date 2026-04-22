<?php

namespace App\Http\Controllers;

use App\Models\MedicalCertificate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Mpdf\Mpdf;

class MedicalCertificateController extends Controller {
    /**
     * Génère un certificat médical Word à partir du template et des variables fournies
     */
    public function generate(Request $request)
    {
        try {
            return $this->generatePdfFromVariables([
                'adresse' => (string) $request->input('adresse', ''),
                'telephone' => (string) $request->input('telephone', ''),
                'nom du docteur' => (string) $request->input('nom du docteur', ''),
                'MATLABUL SHIFAH' => (string) $request->input('MATLABUL SHIFAH', ''),
                'nom de la personne' => (string) $request->input('nom de la personne', ''),
                'date' => (string) $request->input('date', ''),
                'heure' => (string) $request->input('heure', ''),
                'nombre de jours' => (string) $request->input('nombre de jours', ''),
                'date début' => (string) $request->input('date début', ''),
            ], 'certificat_medical_' . time());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Erreur lors de la génération du certificat : ' . $e->getMessage()], 500);
        }
    }

    /**
     * Génère un certificat médical PDF à partir d'un certificat stocké en base.
     */
    public function generateFromStored(MedicalCertificate $medicalCertificate)
    {
        $medicalCertificate->load(['patient', 'issuer']);

        try {
            $variables = $this->buildTemplateVariablesFromCertificate($medicalCertificate);

            $templateVersion = $this->resolveMedicalCertificateTemplateVersion();
            $versionKey = md5(implode('|', [
                (string) $medicalCertificate->id,
                (string) ($medicalCertificate->updated_at?->timestamp ?? ''),
                (string) ($medicalCertificate->issue_date ?? ''),
                (string) ($medicalCertificate->consultation_time ?? ''),
                (string) ($medicalCertificate->rest_days ?? ''),
                (string) ($medicalCertificate->rest_start_date ?? ''),
                md5(json_encode($variables, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}'),
                $templateVersion,
            ]));

            $cacheDir = storage_path('app/generated/certificates');
            File::ensureDirectoryExists($cacheDir);
            $cachedPdfPath = $cacheDir . DIRECTORY_SEPARATOR . 'certificat_medical_' . $medicalCertificate->id . '_' . $versionKey . '.pdf';

            if (file_exists($cachedPdfPath)) {
                return response()->download($cachedPdfPath, 'certificat_medical_' . $medicalCertificate->id . '.pdf');
            }

            $tmpPdfPath = $this->renderMedicalCertificatePdf($variables, 'certificat_medical_' . $medicalCertificate->id . '_' . time());

            foreach (File::glob($cacheDir . DIRECTORY_SEPARATOR . 'certificat_medical_' . $medicalCertificate->id . '_*.pdf') as $oldCacheFile) {
                if ($oldCacheFile !== $cachedPdfPath) {
                    File::delete($oldCacheFile);
                }
            }

            if (file_exists($cachedPdfPath)) {
                File::delete($cachedPdfPath);
            }

            File::move($tmpPdfPath, $cachedPdfPath);

            return response()->download($cachedPdfPath, 'certificat_medical_' . $medicalCertificate->id . '.pdf');
        } catch (\Exception $e) {
            return response()->json(['error' => 'Erreur lors de la génération du certificat : ' . $e->getMessage()], 500);
        }
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = MedicalCertificate::with(['patient', 'issuer'])->latest('issue_date');
        
        // Filtrer par patient
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->input('patient_id'));
        }
        
        $certificates = $query->paginate(20);
        return response()->json($certificates);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'issue_date' => ['required', 'date'],
            'consultation_time' => ['nullable', 'date_format:H:i'],
            'rest_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'rest_start_date' => ['nullable', 'date'],
        ]);

        $validated['issued_by'] = $request->user()->id;
        $validated['certificate_type'] = 'certificat_medical';
        $validated['content'] = $this->buildStoredContent($validated);

        $certificate = MedicalCertificate::create($validated);
        $certificate->load(['patient', 'issuer']);
        return response()->json($certificate, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(MedicalCertificate $medicalCertificate)
    {
        $medicalCertificate->load(['patient', 'issuer']);
        return response()->json($medicalCertificate);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(MedicalCertificate $medicalCertificate)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, MedicalCertificate $medicalCertificate)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(MedicalCertificate $medicalCertificate)
    {
        //
    }

    private function buildStoredContent(array $validated): string
    {
        $parts = [
            'Certificat medical du ' . $validated['issue_date'],
        ];

        if (!empty($validated['consultation_time'])) {
            $parts[] = 'heure: ' . $validated['consultation_time'];
        }

        if (!empty($validated['rest_days'])) {
            $parts[] = 'repos: ' . $validated['rest_days'] . ' jour(s)';
        }

        if (!empty($validated['rest_start_date'])) {
            $parts[] = 'debut: ' . $validated['rest_start_date'];
        }

        return implode(' | ', $parts);
    }

    private function buildTemplateVariablesFromCertificate(MedicalCertificate $medicalCertificate): array
    {
        $patientFullName = trim(($medicalCertificate->patient->first_name ?? '') . ' ' . ($medicalCertificate->patient->last_name ?? ''));

        return [
            'adresse' => config('app.cabinet_address', 'Parcelle'),
            'telephone' => config('app.cabinet_phone', '0600000000'),
            'nom du docteur' => (string) ($medicalCertificate->issuer->name ?? ''),
            'MATLABUL SHIFAH' => $this->normalizeCabinetName((string) config('app.cabinet_name', 'MATLABUL SHIFAH')),
            'nom de la personne' => $patientFullName,
            'date' => (string) $medicalCertificate->issue_date,
            'heure' => (string) ($medicalCertificate->consultation_time ?? ''),
            'nombre de jours' => (string) ($medicalCertificate->rest_days ?? ''),
            'date début' => (string) ($medicalCertificate->rest_start_date ?? ''),
        ];
    }

    private function generatePdfFromVariables(array $variables, string $baseName)
    {
        try {
            $outputPdf = $this->renderMedicalCertificatePdf($variables, $baseName);

            return response()->download($outputPdf, $baseName . '.pdf')->deleteFileAfterSend(true);
        } catch (\Throwable $e) {
            Log::error('Medical certificate PDF generation failed', [
                'base_name' => $baseName,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Erreur lors de la génération du PDF.',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    private function renderMedicalCertificatePdf(array $variables, string $baseName): string
    {
        $pdfData = $this->buildMedicalCertificatePdfData($variables);
        $html = view('pdf.medical_certificate', $pdfData)->render();

        $tempDir = storage_path('app/mpdf');
        File::ensureDirectoryExists($tempDir);

        $tmpPdfDir = storage_path('app/generated/tmp');
        File::ensureDirectoryExists($tmpPdfDir);
        $outputPdf = $tmpPdfDir . DIRECTORY_SEPARATOR . $baseName . '.pdf';

        $mpdf = new Mpdf([
            'format' => 'A4',
            'orientation' => 'P',
            'tempDir' => $tempDir,
            'margin_left' => 12,
            'margin_right' => 12,
            'margin_top' => 10,
            'margin_bottom' => 10,
            'margin_header' => 4,
            'margin_footer' => 4,
            'default_font' => 'dejavusans',
            'default_font_size' => 11,
        ]);

        $mpdf->SetTitle('Certificat médical');
        $mpdf->SetAuthor((string) ($variables['nom du docteur'] ?? ''));
        $mpdf->SetSubject('Certificat médical cabinet dentaire');
        $mpdf->WriteHTML($html);
        $mpdf->Output($outputPdf, 'F');

        return $outputPdf;
    }

    private function buildMedicalCertificatePdfData(array $variables): array
    {
        $personName = (string) ($variables['nom de la personne'] ?? '');

        return [
            'cabinetName' => $this->normalizeCabinetName((string) ($variables['MATLABUL SHIFAH'] ?? 'MATLABUL SHIFAH')),
            'cabinetAddress' => (string) ($variables['adresse'] ?? ''),
            'cabinetPhone' => (string) ($variables['telephone'] ?? ''),
            'logoDataUri' => $this->fileToDataUri(public_path('images/logoCabinet.png')),
            'doctorName' => (string) ($variables['nom du docteur'] ?? ''),
            'personName' => $personName,
            'issueDate' => (string) ($variables['date'] ?? ''),
            'consultationTime' => (string) ($variables['heure'] ?? ''),
            'restDays' => (string) ($variables['nombre de jours'] ?? ''),
            'restStartDate' => (string) (($variables['date début'] ?? ($variables['date debut'] ?? ''))),
        ];
    }

    private function resolveMedicalCertificateTemplateVersion(): string
    {
        $templatePath = resource_path('views/pdf/medical_certificate.blade.php');
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
