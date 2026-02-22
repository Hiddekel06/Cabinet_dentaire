<?php

namespace App\Http\Controllers;

use App\Models\MedicalCertificate;
use Illuminate\Http\Request;

class MedicalCertificateController extends Controller
{
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
            'certificate_type' => ['nullable', 'string', 'max:255'],
            'content' => ['required', 'string'],
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
