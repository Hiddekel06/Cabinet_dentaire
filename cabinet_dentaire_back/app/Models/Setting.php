<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $primaryKey = 'key';
    public $incrementing  = false;
    protected $keyType    = 'string';

    protected $fillable = ['key', 'value', 'type'];

    /**
     * Récupère une valeur de configuration avec fallback.
     * Ne plante JAMAIS même si la table n'existe pas encore.
     */
    public static function getValue(string $key, mixed $fallback = null): mixed
    {
        try {
            $setting = self::find($key);
            if ($setting && $setting->value !== null && $setting->value !== '') {
                return $setting->value;
            }
        } catch (\Throwable) {
            // Table absente ou erreur DB : on retombe sur le fallback
        }

        // Fallback sur la configuration existante (rétrocompatibilité totale)
        return match ($key) {
            'cabinet_name'                        => $fallback ?? config('app.cabinet_name', 'Matlabul Shifah'),
            'cabinet_address'                     => $fallback ?? config('app.cabinet_address', ''),
            'cabinet_phone'                       => $fallback ?? config('app.cabinet_phone', ''),
            'cabinet_theme'                       => $fallback ?? 'default',
            'module_clinical_observations_enabled' => $fallback ?? false,
            'module_medical_folder_enabled'       => $fallback ?? false,
            default                               => $fallback,
        };
    }
}
