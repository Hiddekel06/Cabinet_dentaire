<?php

namespace App\Http\Controllers;

use App\Models\MedicalCertificate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

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
            return $this->generatePdfFromVariables($this->buildTemplateVariablesFromCertificate($medicalCertificate), 'certificat_medical_' . $medicalCertificate->id . '_' . time());
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
            'MATLABUL SHIFAH' => config('app.cabinet_name', 'MATLABUL SHIFAH'),
            'nom de la personne' => $patientFullName,
            'date' => (string) $medicalCertificate->issue_date,
            'heure' => (string) ($medicalCertificate->consultation_time ?? ''),
            'nombre de jours' => (string) ($medicalCertificate->rest_days ?? ''),
            'date début' => (string) ($medicalCertificate->rest_start_date ?? ''),
        ];
    }

    private function generatePdfFromVariables(array $variables, string $baseName)
    {
        $templatePath = resource_path('template/template_certificat.docx');
        if (!file_exists($templatePath)) {
            return response()->json(['error' => 'Le modèle Word est introuvable.'], 500);
        }

        $templateProcessor = new \PhpOffice\PhpWord\TemplateProcessor($templatePath);
        foreach ($variables as $key => $value) {
            $templateProcessor->setValue($key, (string) ($value ?? ''));
        }

        $outputWord = storage_path('app/' . $baseName . '.docx');
        $templateProcessor->saveAs($outputWord);

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
    }
}
