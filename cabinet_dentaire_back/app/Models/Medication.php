<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Medication extends Model
{
    protected $fillable = [
        'name',
        'category',
        'default_frequency',
        'default_duration',
        'is_active',
    ];

    public function ordonnanceItems()
    {
        return $this->hasMany(OrdonnanceItem::class);
    }
}
