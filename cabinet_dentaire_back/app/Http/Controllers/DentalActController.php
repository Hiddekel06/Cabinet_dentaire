<?php

namespace App\Http\Controllers;

use App\Models\DentalAct;
use App\Imports\DentalActsImport;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class DentalActController extends Controller
{
    /**
     * Liste tous les actes dentaires
     */
    public function index(Request $request)
    {
        $query = DentalAct::query();

        // Filtrer par catégorie si fourni
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        // Recherche dans name ou code
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        // Pagination optionnelle
        if ($request->has('per_page')) {
            $dentalActs = $query->orderBy('code')->paginate($request->per_page);
        } else {
            $dentalActs = $query->orderBy('code')->get();
        }

        return response()->json($dentalActs);
    }

    /**
     * Recherche d'actes dentaires par code ou nom
     */
    public function search(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'query' => 'required|string|min:1'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Veuillez fournir un terme de recherche',
                'errors' => $validator->errors()
            ], 422);
        }

        $query = $request->query;

        $results = DentalAct::where('code', 'like', "%{$query}%")
            ->orWhere('name', 'like', "%{$query}%")
            ->orWhere('category', 'like', "%{$query}%")
            ->limit(20)
            ->get();

        return response()->json([
            'data' => $results,
            'count' => $results->count()
        ]);
    }

    /**
     * Import des actes dentaires depuis Excel
     */
    public function import(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Fichier invalide',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $file = $request->file('file');
            
            // Créer l'instance d'import
            $import = new DentalActsImport();
            
            // Importer le fichier
            Excel::import($import, $file);
            
            // Récupérer les statistiques
            $stats = $import->getImportStats();
            
            // Log de l'import
            Log::info('Import dental acts completed', [
                'user_id' => auth()->id(),
                'stats' => $stats
            ]);

            return response()->json([
                'message' => 'Import terminé avec succès',
                'stats' => [
                    'imported' => $stats['imported'],
                    'skipped' => $stats['skipped'],
                    'total' => $stats['imported'] + $stats['skipped']
                ],
                'errors' => $stats['errors']
            ], 200);

        } catch (\Exception $e) {
            Log::error('Import dental acts failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Erreur lors de l\'import',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer tous les actes (pour réimporter)
     */
    public function truncate(Request $request)
    {
        try {
            DentalAct::truncate();
            
            return response()->json([
                'message' => 'Tous les actes dentaires ont été supprimés'
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la suppression',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour un acte dentaire (tarif, etc.)
     */
    public function update(Request $request, DentalAct $dentalAct)
    {
        $validated = $request->validate([
            'tarif' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'category' => ['sometimes', 'nullable', 'string', 'max:255'],
            'subcategory' => ['sometimes', 'nullable', 'string', 'max:255'],
            'tarif_level' => ['sometimes', 'nullable', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
        ]);

        $dentalAct->update($validated);

        return response()->json($dentalAct->fresh());
    }
}
