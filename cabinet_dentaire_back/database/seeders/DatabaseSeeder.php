<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Créer l'utilisateur administrateur par défaut (idempotent)
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name'      => 'Administrateur',
                'password'  => Hash::make('password'),
                'role'      => 'admin',
                'is_active' => true,
            ]
        );

        // Seeder pour les types de produits
        $this->call(ProductTypeSeeder::class);

        // Créer le compte superviseur SaaS
        $this->call(SuperviseurSeeder::class);
    }
}
