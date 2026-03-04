<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductType;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Product::with('type');

        // Filtrer par type
        if ($request->has('type_id') && $request->type_id) {
            $query->where('type_id', $request->type_id);
        }

        // Recherche par nom
        if ($request->has('search') && $request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Filtrer par plage de dates
        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('purchase_date', '>=', $request->start_date);
        }

        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('purchase_date', '<=', $request->end_date);
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $products = $query->orderBy('purchase_date', 'desc')->paginate($perPage);

        // Calculer la somme totale
        $totalAmount = Product::sum('total_amount');

        return response()->json([
            'success' => true,
            'data' => $products->items(),
            'pagination' => [
                'total' => $products->total(),
                'per_page' => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'from' => $products->firstItem(),
                'to' => $products->lastItem(),
            ],
            'total_amount' => $totalAmount,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type_id' => 'required|exists:product_types,id',
            'name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0.01',
            'purchase_date' => 'required|date',
        ]);

        // Calculer le montant total
        $validated['total_amount'] = $validated['quantity'] * $validated['unit_price'];

        $product = Product::create($validated);
        $product->load('type');

        return response()->json([
            'success' => true,
            'message' => 'Produit créé avec succès',
            'data' => $product,
        ], Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    public function show(Product $product)
    {
        $product->load('type');

        return response()->json([
            'success' => true,
            'data' => $product,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'type_id' => 'required|exists:product_types,id',
            'name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'required|numeric|min:0.01',
            'purchase_date' => 'required|date',
        ]);

        // Recalculer le montant total
        $validated['total_amount'] = $validated['quantity'] * $validated['unit_price'];

        $product->update($validated);
        $product->load('type');

        return response()->json([
            'success' => true,
            'message' => 'Produit modifié avec succès',
            'data' => $product,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Produit supprimé avec succès',
        ]);
    }

    /**
     * Get statistics about purchases
     */
    public function statistics()
    {
        $totalSpent = Product::sum('total_amount');
        $totalProducts = Product::count();
        $averagePrice = Product::avg('total_amount');
        
        $byType = ProductType::withCount('products')
            ->withSum('products', 'total_amount')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_spent' => $totalSpent,
                'total_products' => $totalProducts,
                'average_price' => $averagePrice,
                'by_type' => $byType,
            ],
        ]);
    }
}
