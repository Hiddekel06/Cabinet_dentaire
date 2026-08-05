<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperviseurSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'paulmbaye@superviseur.com'],
            [
                'name'      => 'Paul Mbaye',
                'email'     => 'paulmbaye@superviseur.com',
                'password'  => Hash::make('passer123'),
                'role'      => 'superviseur',
                'is_active' => true,
            ]
        );
    }
}
