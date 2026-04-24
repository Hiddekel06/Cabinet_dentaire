<?php

namespace App\Http\Controllers;

use App\Models\Medication;
use App\Models\OrdonnanceItem;
use Illuminate\Http\Request;

class MedicationController extends Controller
{
    public function suggestions(Request $request)
    {
        $term = trim((string) $request->input('query', ''));

        $historyQuery = OrdonnanceItem::query()
            ->selectRaw('medication_id, medication_name, frequency, duration, COUNT(*) as used_count, MAX(created_at) as last_used_at')
            ->when($term !== '', function ($query) use ($term) {
                $query->where('medication_name', 'like', '%' . $term . '%');
            })
            ->groupBy('medication_id', 'medication_name', 'frequency', 'duration')
            ->orderByDesc('used_count')
            ->orderByDesc('last_used_at')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->medication_id,
                    'name' => $item->medication_name,
                    'medication_name' => $item->medication_name,
                    'default_frequency' => $item->frequency,
                    'default_duration' => $item->duration,
                    'source' => 'history',
                    'used_count' => (int) $item->used_count,
                    'last_used_at' => $item->last_used_at,
                ];
            });

        $catalogQuery = Medication::query()->where('is_active', true);

        if ($term !== '') {
            $catalogQuery->where('name', 'like', '%' . $term . '%');
        }

        $catalog = $catalogQuery
            ->orderBy('name')
            ->limit(15)
            ->get()
            ->map(function ($medication) {
                return [
                    'id' => $medication->id,
                    'name' => $medication->name,
                    'medication_name' => $medication->name,
                    'default_frequency' => $medication->default_frequency,
                    'default_duration' => $medication->default_duration,
                    'source' => 'catalog',
                    'used_count' => null,
                    'last_used_at' => null,
                ];
            });

        $combined = collect();

        foreach ($historyQuery as $item) {
            $combined->push($item);
        }

        foreach ($catalog as $item) {
            $exists = $combined->contains(function ($existing) use ($item) {
                return mb_strtolower((string) ($existing['name'] ?? '')) === mb_strtolower((string) ($item['name'] ?? ''));
            });

            if (!$exists) {
                $combined->push($item);
            }
        }

        return response()->json($combined->take(20)->values());
    }
}
