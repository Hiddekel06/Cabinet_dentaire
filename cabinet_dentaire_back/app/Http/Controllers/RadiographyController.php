<?php

namespace App\Http\Controllers;

use App\Models\Radiography;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class RadiographyController extends Controller
{
    public function index(Request $request)
    {
        $query = Radiography::query()->with('patient');

        // Filtrer par patient
        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->input('patient_id'));
        }

        $radiographies = $query->latest('scan_date')->paginate(15);

        return response()->json($radiographies);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'], // 10MB max
            'scan_date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string'],
        ]);

        // Upload du fichier
        $file = $request->file('file');
        $path = $file->store('radiographies', 'public');

        $radiography = Radiography::create([
            'patient_id' => $validated['patient_id'],
            'file_path' => $path,
            'scan_date' => $validated['scan_date'],
            'description' => $validated['description'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        $radiography->load('patient');

        return response()->json($radiography, 201);
    }

    public function show(Radiography $radiography)
    {
        $radiography->load('patient');

        return response()->json($radiography);
    }

    public function update(Request $request, Radiography $radiography)
    {
        $validated = $request->validate([
            'scan_date' => ['sometimes', 'required', 'date'],
            'description' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string'],
        ]);

        $radiography->update($validated);
        $radiography->load('patient');

        return response()->json($radiography);
    }

    public function destroy(Radiography $radiography)
    {
        // Supprimer le fichier du storage
        if ($radiography->file_path) {
            Storage::disk('public')->delete($radiography->file_path);
        }

        $radiography->delete();

        return response()->noContent();
    }

    public function file(string $path)
    {
        $normalizedPath = ltrim($path, '/');

        // Autoriser uniquement le dossier radiographies
        if (!str_starts_with($normalizedPath, 'radiographies/')) {
            abort(404);
        }

        if (!Storage::disk('public')->exists($normalizedPath)) {
            abort(404);
        }

        // Some hosts inject output before binary responses; clear buffers to avoid corrupting image/PDF bytes.
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        return response()->file(Storage::disk('public')->path($normalizedPath));
    }
}
