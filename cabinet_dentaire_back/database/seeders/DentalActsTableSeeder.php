<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DentalActsTableSeeder extends Seeder
{
    public function run()
    {
        $file = database_path('seeders/data/dental_acts.csv');
        if (!file_exists($file)) {
            echo "Fichier CSV non trouvé: $file\n";
            return;
        }

        $handle = fopen($file, 'r');
        $header = fgetcsv($handle);

        while (($row = fgetcsv($handle)) !== false) {
            $data = array_combine($header, $row);
            DB::table('dental_acts')->insert([
                'name' => $data['name'],
                'category' => $data['category'],
                'code' => $data['code'],
                'tarif' => $data['tarif'],
                'description' => $data['description'] ?? null,
            ]);
        }
        fclose($handle);
    }
}
