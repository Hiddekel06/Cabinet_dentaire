<?php

namespace App\Http\Controllers;

use App\Models\Medication;
use Illuminate\Http\Request;

class MedicationController extends Controller
{
    public function suggestions(Request $request)
    {
        $query = Medication::query()->where('is_active', true)->orderBy('name');

        if ($request->filled('query')) {
            $term = $request->input('query');
            $query->where('name', 'like', "%{$term}%");
        }

        return response()->json($query->limit(20)->get());
    }
}
