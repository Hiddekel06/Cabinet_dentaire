<?php

namespace App\Http\Controllers;

use App\Models\Treatment;
use Illuminate\Http\Request;

class TreatmentController extends Controller
{
    public function index()
    {
        $treatments = Treatment::query()
            ->orderBy('name')
            ->paginate(50);

        return response()->json($treatments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:treatments,name'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'duration' => ['nullable', 'integer', 'min:1'],
        ]);

        $treatment = Treatment::create($validated);

        return response()->json($treatment, 201);
    }

    public function show(Treatment $treatment)
    {
        return response()->json($treatment);
    }

    public function update(Request $request, Treatment $treatment)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', "unique:treatments,name,{$treatment->id}"],
            'description' => ['nullable', 'string'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'duration' => ['nullable', 'integer', 'min:1'],
        ]);

        $treatment->update($validated);

        return response()->json($treatment);
    }

    public function destroy(Treatment $treatment)
    {
        $treatment->delete();

        return response()->noContent();
    }
}
