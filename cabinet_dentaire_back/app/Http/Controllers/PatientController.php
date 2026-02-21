<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    public function index()
    {
        $patients = Patient::query()
            ->with([
                'appointments' => function ($query) {
                    $query->latest('appointment_date')->limit(1);
                },
                'medicalRecords' => function ($query) {
                    $query->latest()->limit(1);
                },
            ])
            ->latest()
            ->paginate(15);

        $patients->getCollection()->transform(function ($patient) {
            $lastAppointment = $patient->appointments->first();
            $lastRecord = $patient->medicalRecords->first();

            $patient->last_appointment_date = $lastAppointment?->appointment_date;
            $patient->last_appointment_status = $lastAppointment?->status;
            $patient->last_treatment = $lastRecord?->treatment_performed;

            $patient->status = match ($lastAppointment?->status) {
                'pending', 'confirmed' => 'En traitement',
                'completed' => 'Suivi',
                'cancelled' => 'Nouveau',
                default => 'Nouveau',
            };

            return $patient;
        });

        return response()->json($patients);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', 'in:M,F,Other'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
        ]);

        $patient = Patient::create($validated);

        return response()->json($patient, 201);
    }

    public function show(Patient $patient)
    {
        $patient->load([
            'appointments' => function ($query) {
                $query->latest('appointment_date')->limit(1);
            },
            'medicalRecords' => function ($query) {
                $query->latest()->limit(1);
            },
        ]);

        $lastAppointment = $patient->appointments->first();
        $lastRecord = $patient->medicalRecords->first();

        $patient->last_appointment_date = $lastAppointment?->appointment_date;
        $patient->last_appointment_status = $lastAppointment?->status;
        $patient->last_treatment = $lastRecord?->treatment_performed;

        $patient->status = match ($lastAppointment?->status) {
            'pending', 'confirmed' => 'En traitement',
            'completed' => 'Suivi',
            'cancelled' => 'Nouveau',
            default => 'Nouveau',
        };

        return response()->json($patient);
    }

    public function update(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'max:20'],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', 'in:M,F,Other'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
        ]);

        $patient->update($validated);

        return response()->json($patient);
    }

    public function destroy(Patient $patient)
    {
        $patient->delete();

        return response()->noContent();
    }
}
