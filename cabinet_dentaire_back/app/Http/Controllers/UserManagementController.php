<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    private const MANAGED_ROLES = ['admin', 'doctor', 'secretary'];

    public function index(Request $request)
    {
        $query = User::query()
            ->whereIn('role', self::MANAGED_ROLES)
            ->orderBy('role')
            ->orderBy('name');

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%')
                    ->orWhere('phone', 'like', '%' . $search . '%');
            });
        }

        return response()->json([
            'data' => $query->get(['id', 'name', 'email', 'phone', 'role', 'is_active', 'created_at', 'updated_at']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'role' => ['required', 'string', Rule::in(self::MANAGED_ROLES)],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
            'password' => Hash::make($validated['password']),
            'is_active' => (bool) ($validated['is_active'] ?? true),
        ]);

        return response()->json([
            'message' => 'Compte créé avec succès.',
            'data' => $user->only(['id', 'name', 'email', 'phone', 'role', 'is_active', 'created_at', 'updated_at']),
        ], 201);
    }

    public function update(Request $request, User $user)
    {
        if (!in_array($user->role, self::MANAGED_ROLES, true)) {
            return response()->json(['message' => 'Ce compte ne peut pas être géré depuis cette interface.'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'role' => ['required', 'string', Rule::in(self::MANAGED_ROLES)],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'confirmed'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $payload = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
            'is_active' => (bool) ($validated['is_active'] ?? false),
        ];

        if (!empty($validated['password'])) {
            $payload['password'] = Hash::make($validated['password']);
        }

        $user->update($payload);

        return response()->json([
            'message' => 'Compte mis à jour avec succès.',
            'data' => $user->fresh()->only(['id', 'name', 'email', 'phone', 'role', 'is_active', 'created_at', 'updated_at']),
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        if (!in_array($user->role, self::MANAGED_ROLES, true)) {
            return response()->json(['message' => 'Ce compte ne peut pas être supprimé depuis cette interface.'], 403);
        }

        if ($request->user()?->id === $user->id) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'Compte supprimé avec succès.']);
    }
}