<?php

namespace Database\Seeders;

use App\Models\ProductType;
use Illuminate\Database\Seeder;

class ProductTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            [
                'name' => 'Médicament',
                'color' => 'emerald',
                'icon' => '💊',
            ],
            [
                'name' => 'Matériel',
                'color' => 'blue',
                'icon' => '🔧',
            ],
           
        ];

        foreach ($types as $type) {
            ProductType::firstOrCreate(
                ['name' => $type['name']],
                [
                    'color' => $type['color'],
                    'icon' => $type['icon'],
                ]
            );
        }
    }
}
