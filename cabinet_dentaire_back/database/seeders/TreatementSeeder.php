<?php

namespace Database\Seeders;

use App\Models\Treatment;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TreatementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $treatments = [
            [
                'name' => 'Détartrage',
                'description' => 'Nettoyage des tartre et plaque dentaire',
                'price' => 50.00,
                'duration' => 30,
            ],
            [
                'name' => 'Traitement de caries',
                'description' => 'Détection et traitement des caries dentaires',
                'price' => 80.00,
                'duration' => 45,
            ],
            [
                'name' => 'Dévitalisation (traitement de canal)',
                'description' => 'Traitement du nerf dentaire',
                'price' => 200.00,
                'duration' => 60,
            ],
            [
                'name' => 'Détartrage profond',
                'description' => 'Nettoyage en profondeur des gencives',
                'price' => 120.00,
                'duration' => 60,
            ],
            [
                'name' => 'Blanchiment dentaire',
                'description' => 'Éclaircissement des dents',
                'price' => 150.00,
                'duration' => 45,
            ],
            [
                'name' => 'Détartrage et fluor',
                'description' => 'Nettoyage avec application de fluor',
                'price' => 60.00,
                'duration' => 30,
            ],
            [
                'name' => 'Extraction dentaire',
                'description' => 'Extraction d\'une dent',
                'price' => 100.00,
                'duration' => 30,
            ],
            [
                'name' => 'Détartrage enfant',
                'description' => 'Nettoyage adapté aux enfants',
                'price' => 40.00,
                'duration' => 20,
            ],
            [
                'name' => 'Bilan dentaire',
                'description' => 'Examen et diagnostic complet',
                'price' => 30.00,
                'duration' => 20,
            ],
            [
                'name' => 'Traitement gingivite',
                'description' => 'Traitement de l\'inflammation des gencives',
                'price' => 90.00,
                'duration' => 40,
            ],
        ];

        foreach ($treatments as $treatment) {
            Treatment::create($treatment);
        }
    }
}
