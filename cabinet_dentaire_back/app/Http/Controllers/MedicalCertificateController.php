<?php

namespace App\Http\Controllers;

use App\Models\MedicalCertificate;
use Illuminate\Http\Request;

class MedicalCertificateController extends Controller {
    /**
     * Génère un certificat médical Word à partir du template et des variables fournies
     */
    public function generate(Request $request)
    {
        $templatePath = resource_path('template/template_certificat.docx');
        if (!file_exists($templatePath)) {
            return response()->json(['error' => 'Le modèle Word est introuvable.'], 500);
        }
        try {
            $templateProcessor = new \PhpOffice\PhpWord\TemplateProcessor($templatePath);
            // Remplace les variables du Word selon ton modèle
            $templateProcessor->setValue('adresse', $request->input('adresse', ''));
            $templateProcessor->setValue('telephone', $request->input('telephone', ''));
            $templateProcessor->setValue('nom du docteur', $request->input('nom du docteur', ''));
            $templateProcessor->setValue('MATLABUL SHIFAH', $request->input('MATLABUL SHIFAH', ''));
            $templateProcessor->setValue('nom de la personne', $request->input('nom de la personne', ''));
            $templateProcessor->setValue('date', $request->input('date', ''));
            $templateProcessor->setValue('heure', $request->input('heure', ''));
            // Sauvegarde le fichier Word généré
            $outputWord = storage_path('app/certificat_medical_' . time() . '.docx');
            $templateProcessor->saveAs($outputWord);

            // Conversion en PDF via LibreOffice (soffice)
            $outputPdf = preg_replace('/\.docx$/', '.pdf', $outputWord);
            $cmd = 'soffice --headless --convert-to pdf --outdir "' . dirname($outputWord) . '" "' . $outputWord . '"';
            $result = null;
            $retval = null;
            exec($cmd, $result, $retval);
            if (!file_exists($outputPdf)) {
                return response()->json(['error' => 'Erreur lors de la conversion PDF.'], 500);
            }
            // Retourne le PDF à télécharger
            return response()->download($outputPdf)->deleteFileAfterSend(true);
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
        ]);
        $validated['issued_by'] = $request->user()->id;
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
}
