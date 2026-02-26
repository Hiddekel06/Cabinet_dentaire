<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DentalActsTableSeeder extends Seeder
{
    public function run()
    {
        // Supprimer toutes les lignes sans casser les clés étrangères
        \DB::table('dental_acts')->delete();
        \DB::statement('ALTER TABLE dental_acts AUTO_INCREMENT = 1');
        $file = database_path('seeders/data/dental_acts_clean.csv');
        if (!file_exists($file)) {
            echo "Fichier CSV non trouvé: $file\n";
            return;
        }

        $handle = fopen($file, 'r');
        $header = fgetcsv($handle);
        $lineNumber = 1;
        while (($row = fgetcsv($handle)) !== false) {
            $lineNumber++;
            // Nettoyage des champs
            $row = array_map(function($v) { return trim($v, " \t\n\r\0\x0B\xEF\xBB\xBF"); }, $row);
            if (count($row) !== count($header)) {
                echo "Ligne $lineNumber ignorée (malformée): ".json_encode($row)."\n";
                continue;
            }
            $data = array_combine($header, $row);
            if (empty($data['name'])) {
                echo "Ligne $lineNumber ignorée (nom vide): ".json_encode($row)."\n";
                continue;
            }
            $tarifRaw = preg_replace('/[^0-9]/', '', $data['tarif']);
            $tarif = ($tarifRaw !== '') ? (int)$tarifRaw : 0;
            DB::table('dental_acts')->insert([
                'name' => $data['name'],
                'category' => $data['category'],
                'code' => $data['code'],
                'tarif' => $tarif,
                'description' => $data['description'] ?? null,
            ]);
            echo "Ligne $lineNumber insérée: ".$data['name']." (tarif: $tarif)\n";
        }
        fclose($handle);
    }
}
