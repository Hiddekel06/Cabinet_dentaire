<?php

namespace App\Http\Controllers;

use App\Models\ProductType;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ProductTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $productTypes = ProductType::all();

        return response()->json([
            'success' => true,
            'data' => $productTypes,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:product_types',
            'color' => 'nullable|string',
            'icon' => 'nullable|string',
        ]);

        $productType = ProductType::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Type de produit créé avec succès',
            'data' => $productType,
        ], Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    public function show(ProductType $productType)
    {
        return response()->json([
            'success' => true,
            'data' => $productType,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ProductType $productType)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:product_types,name,' . $productType->id,
            'color' => 'nullable|string',
            'icon' => 'nullable|string',
        ]);

        $productType->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Type de produit modifié avec succès',
            'data' => $productType,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ProductType $productType)
    {
        $productType->delete();

        return response()->json([
            'success' => true,
            'message' => 'Type de produit supprimé avec succès',
        ]);
    }
}
