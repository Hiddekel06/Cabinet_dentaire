<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    /**
     * Récupère tous les paramètres.
     * Retourne toujours une réponse, même si la table est vide.
     */
    public function index()
    {
        try {
            $settings = Setting::all()->pluck('value', 'key')->toArray();
        } catch (\Throwable) {
            $settings = [];
        }

        $defaults = [
            'cabinet_name'    => config('app.cabinet_name', 'Matlabul Shifah'),
            'cabinet_address' => config('app.cabinet_address', ''),
            'cabinet_phone'   => config('app.cabinet_phone', ''),
            'cabinet_logo'    => null,
            'pdf_header_text' => null,
        ];

        $merged = array_merge($defaults, array_filter($settings, fn($v) => $v !== null && $v !== ''));

        // Générer l'URL publique du logo si un chemin est enregistré
        if (!empty($merged['cabinet_logo'])) {
            $merged['cabinet_logo_url'] = Storage::url($merged['cabinet_logo']);
        } else {
            $merged['cabinet_logo_url'] = null;
        }

        return response()->json($merged);
    }

    /**
     * Met à jour les paramètres textuels du cabinet.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'cabinet_name'    => ['sometimes', 'nullable', 'string', 'max:150'],
            'cabinet_address' => ['sometimes', 'nullable', 'string', 'max:300'],
            'cabinet_phone'   => ['sometimes', 'nullable', 'string', 'max:50'],
            'pdf_header_text' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        foreach ($validated as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value, 'type' => 'string']
            );
        }

        try {
            Cache::forget('dashboard:overview:day');
            Cache::forget('dashboard:overview:week');
            Cache::forget('dashboard:overview:month');
            Cache::forget('dashboard:overview:year');
        } catch (\Throwable) {
            // non-fatal
        }

        return response()->json(['message' => 'Paramètres mis à jour avec succès.']);
    }

    /**
     * Upload du logo cabinet.
     */
    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg,webp,svg', 'max:2048'],
        ]);

        try {
            $old = Setting::find('cabinet_logo');
            if ($old && $old->value) {
                Storage::delete($old->value);
            }
        } catch (\Throwable) {
            // swallow
        }

        $path = $request->file('logo')->store('logos', 'public');

        Setting::updateOrCreate(
            ['key' => 'cabinet_logo'],
            ['value' => $path, 'type' => 'image_path']
        );

        return response()->json([
            'message'          => 'Logo mis à jour avec succès.',
            'cabinet_logo'     => $path,
            'cabinet_logo_url' => Storage::url($path),
        ]);
    }

    /**
     * Supprime le logo du cabinet.
     */
    public function deleteLogo()
    {
        try {
            $setting = Setting::find('cabinet_logo');
            if ($setting && $setting->value) {
                Storage::delete($setting->value);
                $setting->update(['value' => null]);
            }
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Erreur lors de la suppression du logo.'], 500);
        }

        return response()->json(['message' => 'Logo supprimé.']);
    }
}
