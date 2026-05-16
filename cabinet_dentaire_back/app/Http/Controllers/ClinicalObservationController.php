<?php

namespace App\Http\Controllers;

use App\Models\ClinicalObservation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Mpdf\Mpdf;

class ClinicalObservationController extends Controller
{
    /**
     * Génère un compte-rendu PDF professionnel de l'observation clinique.
     */
    public function generatePDF(ClinicalObservation $clinicalObservation)
    {
        $clinicalObservation->load(['patient', 'creator']);

        $html = view('pdf.clinical_observation', [
            'observation' => $clinicalObservation,
            'cabinetName' => (string) config('app.cabinet_name', 'Matlabul Shifah'),
            'cabinetAddress' => (string) config('app.cabinet_address', ''),
            'cabinetPhone' => (string) config('app.cabinet_phone', ''),
        ])->render();

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A4',
            'margin_left' => 0,
            'margin_right' => 0,
            'margin_top' => 0,
            'margin_bottom' => 0,
        ]);

        $mpdf->WriteHTML($html);
        
        $filename = "observation_" . $clinicalObservation->patient->last_name . "_" . $clinicalObservation->date->format('d_m_Y') . ".pdf";

        return response($mpdf->Output($filename, 'S'))
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }

    /**
     * Liste des observations (filtrable par patient).
     */
    public function index(Request $request)
    {
        $query = ClinicalObservation::with(['patient', 'creator']);

        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->input('patient_id'));
        }

        return response()->json($query->latest('date')->paginate(15));
    }

    /**
     * Enregistrer une nouvelle observation complexe.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'date' => 'required|date',
            
            // Sections optionnelles
            'reason_for_consultation' => 'nullable|string',
            'history_of_illness' => 'nullable|string',
            'atcd_personal_med' => 'nullable|string',
            'atcd_personal_chir' => 'nullable|string',
            'atcd_family_med' => 'nullable|string',
            'atcd_family_chir' => 'nullable|string',
            
            // Constantes
            'consciousness' => 'nullable|string|max:255',
            'mucous_membranes' => 'nullable|string|max:255',
            'blood_pressure' => 'nullable|string|max:20',
            'pulse' => 'nullable|integer',
            'temperature' => 'nullable|numeric',
            'blood_sugar' => 'nullable|string|max:20',
            'weight' => 'nullable|numeric',
            'skin_fold_major' => 'nullable|string',
            'skin_fold_minor' => 'nullable|string',
            'lower_limb_edema' => 'nullable|string',
            'calves' => 'nullable|string',
            
            // Examen physique
            'physical_exam_cardio' => 'nullable|string',
            'physical_exam_pulmonary' => 'nullable|string',
            'physical_exam_neurological' => 'nullable|string',
            'physical_exam_locomotor' => 'nullable|string',
            'physical_exam_digestive' => 'nullable|string',
            'physical_exam_others' => 'nullable|string',
            
            // Synthèse
            'syndromic_summary' => 'nullable|string',
            'diagnostic_hypotheses' => 'nullable|string',
            'emergency_management' => 'nullable|string',
            'positive_diagnostic' => 'nullable|string',
            'tests_biology' => 'nullable|string',
            'tests_imaging' => 'nullable|string',
            'treatments' => 'nullable|string',
            'follow_up' => 'nullable|string',
        ]);

        $validated['created_by'] = Auth::id();

        $observation = ClinicalObservation::create($validated);

        return response()->json($observation->load('creator'), 201);
    }

    /**
     * Détails d'une observation.
     */
    public function show(ClinicalObservation $clinicalObservation)
    {
        return response()->json($clinicalObservation->load(['patient', 'creator']));
    }

    /**
     * Mise à jour d'une observation.
     */
    public function update(Request $request, ClinicalObservation $clinicalObservation)
    {
        $validated = $request->validate([
            'date' => 'sometimes|required|date',
            'reason_for_consultation' => 'nullable|string',
            'history_of_illness' => 'nullable|string',
            'atcd_personal_med' => 'nullable|string',
            'atcd_personal_chir' => 'nullable|string',
            'atcd_family_med' => 'nullable|string',
            'atcd_family_chir' => 'nullable|string',
            'consciousness' => 'nullable|string|max:255',
            'mucous_membranes' => 'nullable|string|max:255',
            'blood_pressure' => 'nullable|string|max:20',
            'pulse' => 'nullable|integer',
            'temperature' => 'nullable|numeric',
            'blood_sugar' => 'nullable|string|max:20',
            'weight' => 'nullable|numeric',
            'skin_fold_major' => 'nullable|string',
            'skin_fold_minor' => 'nullable|string',
            'lower_limb_edema' => 'nullable|string',
            'calves' => 'nullable|string',
            'physical_exam_cardio' => 'nullable|string',
            'physical_exam_pulmonary' => 'nullable|string',
            'physical_exam_neurological' => 'nullable|string',
            'physical_exam_locomotor' => 'nullable|string',
            'physical_exam_digestive' => 'nullable|string',
            'physical_exam_others' => 'nullable|string',
            'syndromic_summary' => 'nullable|string',
            'diagnostic_hypotheses' => 'nullable|string',
            'emergency_management' => 'nullable|string',
            'positive_diagnostic' => 'nullable|string',
            'tests_biology' => 'nullable|string',
            'tests_imaging' => 'nullable|string',
            'treatments' => 'nullable|string',
            'follow_up' => 'nullable|string',
        ]);

        $clinicalObservation->update($validated);

        return response()->json($clinicalObservation->load('creator'));
    }

    /**
     * Suppression d'une observation.
     */
    public function destroy(ClinicalObservation $clinicalObservation)
    {
        $clinicalObservation->delete();

        return response()->noContent();
    }
}
