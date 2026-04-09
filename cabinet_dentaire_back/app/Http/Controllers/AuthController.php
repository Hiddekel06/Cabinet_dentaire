<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
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

        Cache::forget('auth:user:' . $user->id);
        
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
        $user = $request->user();
        $user?->tokens()->delete();
        if ($user) {
            Cache::forget('auth:user:' . $user->id);
        }
        
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Déconnecté avec succès',
        ]);
    }

    public function user(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(null, 401);
        }

        $cacheKey = 'auth:user:' . $user->id;

        $payload = Cache::remember($cacheKey, 60, function () use ($user) {
            return [
                'id' => (int) $user->id,
                'name' => (string) ($user->name ?? ''),
                'email' => (string) ($user->email ?? ''),
                'role' => (string) ($user->role ?? 'doctor'),
            ];
        });

        return response()->json($payload);
    }
}
