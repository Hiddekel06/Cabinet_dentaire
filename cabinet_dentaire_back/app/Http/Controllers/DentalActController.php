<?php

namespace App\Http\Controllers;

use App\Models\DentalAct;
use Illuminate\Http\Request;

class DentalActController extends Controller
{
    public function index()
    {
        return response()->json(DentalAct::all());
    }
}
