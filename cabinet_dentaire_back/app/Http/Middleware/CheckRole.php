<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        // If not logged in or doesn't have the required role, block access
        if (!$user || !in_array($user->role, $roles)) {
            return response()->json([
                'message' => 'Accès refusé. Vous n\'avez pas les permissions nécessaires pour effectuer cette action.',
                'required_roles' => $roles,
                'your_role' => $user ? $user->role : 'guest'
            ], 403);
        }

        // Check if user is active
        if (!$user->is_active) {
            return response()->json([
                'message' => 'Votre compte a été suspendu. Veuillez contacter l\'administrateur.'
            ], 403);
        }

        return $next($request);
    }
}
