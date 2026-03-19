<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants fournis sont incorrects.'],
            ]);
        }

        $user = Auth::user();
        
        // Générer un token Sanctum pour l'authentification API
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'Connecté avec succès',
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        // Révoquer tous les tokens Sanctum de l'utilisateur
        $request->user()->tokens()->delete();
        
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Déconnecté avec succès',
        ]);
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }
}
