<?php

namespace App\Imports;

use App\Models\DentalAct;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\SkipsFailures;
use Maatwebsite\Excel\Validators\Failure;
use Illuminate\Support\Facades\Log;

class DentalActsImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnFailure
{
    use SkipsFailures;

    private $importedCount = 0;
    private $skippedCount = 0;
    private $errors = [];

    /**
     * @param array $row
     *
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        // Nettoyer les données et convertir en string
        $code = (string) trim($row['code'] ?? '');
        $name = trim($row['name'] ?? '');
        $category = trim($row['category'] ?? '');
        $subcategory = !empty($row['subcategory']) ? trim($row['subcategory']) : null;
        $tarifLevel = !empty($row['tarif_level']) ? (string) trim($row['tarif_level']) : null;
        $tarif = $this->parseTarif($row['tarif'] ?? 0);
        $description = !empty($row['description']) ? trim($row['description']) : null;

        // Valider données minimales
        if (empty($code) || empty($name)) {
            $this->skippedCount++;
            $this->errors[] = "Ligne ignorée : code ou name vide - " . json_encode($row);
            return null;
        }

        // Vérifier si le code existe déjà
        if (DentalAct::where('code', $code)->exists()) {
            $this->skippedCount++;
            $this->errors[] = "Code déjà existant : {$code}";
            return null;
        }

        $this->importedCount++;

        return new DentalAct([
            'code' => $code,
            'name' => $name,
            'category' => $category,
            'subcategory' => $subcategory,
            'tarif_level' => $tarifLevel,
            'tarif' => $tarif,
            'description' => $description,
        ]);
    }

    /**
     * Parse le tarif (gère les espaces, les formats différents)
     */
    private function parseTarif($value)
    {
        // Si c'est déjà un nombre
        if (is_numeric($value)) {
            return (int) $value;
        }

        // Si c'est une chaîne
        $value = trim($value);
        
        // Si vide ou "Sur Devis"
        if (empty($value) || stripos($value, 'devis') !== false || stripos($value, 'forfait') !== false) {
            return 0;
        }

        // Retirer les espaces et convertir
        $cleaned = preg_replace('/\s+/', '', $value);
        
        return is_numeric($cleaned) ? (int) $cleaned : 0;
    }

    /**
     * Règles de validation
     */
    public function rules(): array
    {
        return [
            'code' => 'required', // Accepte string ou number
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'subcategory' => 'nullable|string|max:100',
            'tarif_level' => 'nullable', // Accepte string ou number
            'tarif' => 'nullable',
            'description' => 'nullable|string',
        ];
    }

    /**
     * Messages de validation personnalisés
     */
    public function customValidationMessages()
    {
        return [
            'code.required' => 'Le code est obligatoire',
            'name.required' => 'Le nom est obligatoire',
            'category.required' => 'La catégorie est obligatoire',
        ];
    }

    /**
     * Gestion des échecs de validation
     */
    public function onFailure(Failure ...$failures)
    {
        foreach ($failures as $failure) {
            $this->skippedCount++;
            $this->errors[] = "Ligne {$failure->row()}: " . implode(', ', $failure->errors());
            Log::warning('Import dental act failed', [
                'row' => $failure->row(),
                'errors' => $failure->errors(),
                'values' => $failure->values()
            ]);
        }
    }

    /**
     * Récupérer les statistiques d'import
     */
    public function getImportStats()
    {
        return [
            'imported' => $this->importedCount,
            'skipped' => $this->skippedCount,
            'errors' => $this->errors,
        ];
    }
}
