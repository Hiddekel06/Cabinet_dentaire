<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    /**
     * Affiche la vue calendrier mobile PWA
     */
    public function pwaCalendar()
    {
        // On retourne une vue simple (à créer ensuite)
        return view('pwa.calendar');
    }
    public function index()
    {
        $query = Appointment::query()->with(['patient', 'dentist']);

        // Filtre par date si ?date=YYYY-MM-DD fourni
        if (request()->has('date')) {
            $date = request('date');
            $query->whereDate('appointment_date', $date);
        }

        return response()->json(
            $query->latest()->paginate(15)
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'dentist_id' => ['required', 'integer', 'exists:users,id'],
            'appointment_date' => ['required', 'date'],
            'appointment_time_specified' => ['nullable', 'boolean'],
            'duration' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'in:pending,confirmed,completed,cancelled'],
            'reason' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $validated['appointment_time_specified'] = $this->resolveTimeSpecified(
            $request->input('appointment_date'),
            $request->input('appointment_time_specified')
        );

        // Empêcher la création d'un rendez-vous à une date passée
        if (strtotime($validated['appointment_date']) < time()) {
            return response()->json(['message' => 'Impossible de créer un rendez-vous dans le passé.'], 422);
        }

        $appointment = Appointment::create($validated);

        return response()->json($appointment, 201);
    }

    public function show(Appointment $appointment)
    {
        return response()->json($appointment->load(['patient', 'dentist']));
    }

    public function update(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'patient_id' => ['sometimes', 'required', 'integer', 'exists:patients,id'],
            'dentist_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'appointment_date' => ['sometimes', 'required', 'date'],
            'appointment_time_specified' => ['nullable', 'boolean'],
            'duration' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'in:pending,confirmed,completed,cancelled'],
            'reason' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($request->has('appointment_date') || $request->has('appointment_time_specified')) {
            $validated['appointment_time_specified'] = $this->resolveTimeSpecified(
                $request->input('appointment_date', $appointment->appointment_date?->format('Y-m-d H:i:s')),
                $request->input('appointment_time_specified')
            );
        }

        // Empêcher la modification d'un rendez-vous à une date passée
        if (isset($validated['appointment_date']) && strtotime($validated['appointment_date']) < time()) {
            return response()->json(['message' => 'Impossible de modifier un rendez-vous à une date passée.'], 422);
        }

        $appointment->update($validated);

        return response()->json($appointment);
    }

    public function destroy(Appointment $appointment)
    {
        $appointment->delete();

        return response()->noContent();
    }

    private function resolveTimeSpecified(?string $rawDate, $explicitFlag = null): bool
    {
        if (!is_null($explicitFlag)) {
            return filter_var($explicitFlag, FILTER_VALIDATE_BOOLEAN);
        }

        // Date pure (YYYY-MM-DD): heure non précisée.
        if ($rawDate && preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($rawDate))) {
            return false;
        }

        // DateTime fourni: heure précisée.
        return true;
    }
}
