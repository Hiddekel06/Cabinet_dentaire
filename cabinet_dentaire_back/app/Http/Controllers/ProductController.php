<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductType;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use App\Models\Setting;
use Mpdf\Mpdf;
use Carbon\Carbon;

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
            'type_name' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'nullable|numeric|min:0', // Rendu optionnel
            'purchase_date' => 'required|date',
            'invoice' => 'nullable|file|mimes:pdf,png,jpg,jpeg|max:2048', // 2Mo max
        ]);

        // Si le prix n'est pas renseigné, on met 0 par défaut
        $validated['unit_price'] = $validated['unit_price'] ?? 0;

        // Trouver ou créer le type de produit par son nom
        $type = ProductType::firstOrCreate(['name' => $validated['type_name']]);
        $validated['type_id'] = $type->id;
        unset($validated['type_name']);

        // Calculer le montant total
        $validated['total_amount'] = $validated['quantity'] * $validated['unit_price'];

        // Gérer l'upload de la facture
        if ($request->hasFile('invoice')) {
            $validated['invoice_path'] = $request->file('invoice')->store('purchases/invoices', 'local');
        }

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
            'type_name' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'nullable|numeric|min:0',
            'purchase_date' => 'required|date',
            'invoice' => 'nullable|file|mimes:pdf,png,jpg,jpeg|max:2048',
        ]);

        // Si le prix n'est pas renseigné, on met 0 par défaut
        $validated['unit_price'] = $validated['unit_price'] ?? 0;

        // Trouver ou créer le type de produit par son nom
        $type = ProductType::firstOrCreate(['name' => $validated['type_name']]);
        $validated['type_id'] = $type->id;
        unset($validated['type_name']);

        // Recalculer le montant total
        $validated['total_amount'] = $validated['quantity'] * $validated['unit_price'];

        // Gérer l'upload de la facture
        if ($request->hasFile('invoice')) {
            // Supprimer l'ancienne facture si elle existe
            if ($product->invoice_path && Storage::disk('local')->exists($product->invoice_path)) {
                Storage::disk('local')->delete($product->invoice_path);
            }
            $validated['invoice_path'] = $request->file('invoice')->store('purchases/invoices', 'local');
        }

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
        // Supprimer la facture si elle existe
        if ($product->invoice_path && Storage::disk('local')->exists($product->invoice_path)) {
            Storage::disk('local')->delete($product->invoice_path);
        }

        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Produit supprimé avec succès',
        ]);
    }

    /**
     * Serve the invoice file securely
     */
    public function downloadInvoice(Product $product)
    {
        if (!$product->invoice_path || !Storage::disk('local')->exists($product->invoice_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Facture introuvable.',
            ], 404);
        }

        return Storage::disk('local')->response($product->invoice_path);
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

    /**
     * Generate a PDF report of purchases with optional period and type filters.
     */
    public function generateReport(Request $request)
    {
        $validated = $request->validate([
            'period'     => 'nullable|string|in:today,week,month,quarter,custom',
            'start_date' => 'nullable|date',
            'end_date'   => 'nullable|date',
            'type_id'    => 'nullable|integer|exists:product_types,id',
        ]);

        $query = Product::with('type')->orderBy('purchase_date', 'desc');

        // ── Apply date filter based on period ──────────────────
        $period    = $validated['period'] ?? 'month';
        $periodLabel = '';
        $now       = Carbon::now();

        switch ($period) {
            case 'today':
                $query->whereDate('purchase_date', $now->toDateString());
                $periodLabel = "Aujourd'hui (" . $now->format('d/m/Y') . ')';
                break;

            case 'week':
                $start = $now->copy()->startOfWeek();
                $end   = $now->copy()->endOfWeek();
                $query->whereBetween('purchase_date', [$start->toDateString(), $end->toDateString()]);
                $periodLabel = 'Cette semaine (' . $start->format('d/m') . ' – ' . $end->format('d/m/Y') . ')';
                break;

            case 'month':
                $query->whereYear('purchase_date', $now->year)
                      ->whereMonth('purchase_date', $now->month);
                $periodLabel = 'Ce mois (' . $now->translatedFormat('F Y') . ')';
                break;

            case 'quarter':
                $start = $now->copy()->firstOfQuarter();
                $end   = $now->copy()->lastOfQuarter();
                $query->whereBetween('purchase_date', [$start->toDateString(), $end->toDateString()]);
                $periodLabel = 'Ce trimestre (' . $start->format('d/m') . ' – ' . $end->format('d/m/Y') . ')';
                break;

            case 'custom':
                if (!empty($validated['start_date'])) {
                    $query->whereDate('purchase_date', '>=', $validated['start_date']);
                }
                if (!empty($validated['end_date'])) {
                    $query->whereDate('purchase_date', '<=', $validated['end_date']);
                }
                $from  = !empty($validated['start_date']) ? Carbon::parse($validated['start_date'])->format('d/m/Y') : '...';
                $to    = !empty($validated['end_date'])   ? Carbon::parse($validated['end_date'])->format('d/m/Y') : '...';
                $periodLabel = "Période personnalisée ({$from} – {$to})";
                break;

            default:
                $periodLabel = 'Toutes les dates';
        }

        // ── Apply type filter ──────────────────────────────────
        $typeLabel = '';
        if (!empty($validated['type_id'])) {
            $query->where('type_id', $validated['type_id']);
            $type      = ProductType::find($validated['type_id']);
            $typeLabel = $type ? $type->name : '';
        }

        $products   = $query->get();
        $grandTotal = $products->sum('total_amount');

        // ── Build per-type summary ─────────────────────────────
        $byType = $products->groupBy(function ($p) {
            return $p->type->name ?? 'Inconnu';
        })->map(function ($group, $typeName) {
            return [
                'type'  => $typeName,
                'count' => $group->count(),
                'total' => $group->sum('total_amount'),
            ];
        })->sortByDesc('total')->values()->all();

        // ── Cabinet info ───────────────────────────────────────
        $cabinetName    = trim(str_replace('_', ' ', Setting::getValue('cabinet_name')));
        $cabinetAddress = (string) (Setting::getValue('cabinet_address') ?? '');
        $cabinetPhone   = (string) (Setting::getValue('cabinet_phone') ?? '');
        $logoSetting    = Setting::getValue('cabinet_logo');
        $logoPath       = ($logoSetting && Storage::disk('public')->exists($logoSetting))
            ? Storage::disk('public')->path($logoSetting)
            : public_path('images/logoCabinet.png');
        $logoDataUri    = null;
        if (file_exists($logoPath)) {
            $mime        = mime_content_type($logoPath) ?: 'image/png';
            $logoDataUri = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($logoPath));
        }

        // ── Render blade & generate PDF ────────────────────────
        try {
            $html = view('pdf.purchases_report', [
                'cabinetName'  => $cabinetName ?: 'Matlabul Shifah',
                'cabinetAddress' => $cabinetAddress,
                'cabinetPhone' => $cabinetPhone,
                'logoDataUri'  => $logoDataUri,
                'generatedAt'  => Carbon::now()->format('d/m/Y à H:i'),
                'periodLabel'  => $periodLabel,
                'typeLabel'    => $typeLabel,
                'products'     => $products,
                'grandTotal'   => $grandTotal,
                'byType'       => $byType,
            ])->render();

            $tempDir = storage_path('app/mpdf');
            File::ensureDirectoryExists($tempDir);

            $mpdf = new Mpdf([
                'format'       => 'A4',
                'orientation'  => 'P',
                'tempDir'      => $tempDir,
                'margin_left'  => 10,
                'margin_right' => 10,
                'margin_top'   => 10,
                'margin_bottom'=> 10,
                'default_font' => 'dejavusans',
                'default_font_size' => 10,
            ]);

            $mpdf->SetTitle('Rapport des Achats');
            $mpdf->SetAuthor($cabinetName);
            $mpdf->SetSubject('Rapport des dépenses cabinet dentaire');
            $mpdf->WriteHTML($html);

            $pdfContent = $mpdf->Output('', 'S'); // Return as string

            $slug = preg_replace('/\s+/', '_', strtolower($period));
            $filename = 'rapport_achats_' . $slug . '_' . Carbon::now()->format('Ymd_His') . '.pdf';

            return response($pdfContent, 200, [
                'Content-Type'        => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                'Content-Length'      => strlen($pdfContent),
            ]);

        } catch (\Throwable $e) {
            Log::error('Purchases report PDF generation failed', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Erreur lors de la génération du rapport : ' . $e->getMessage(),
            ], 500);
        }
    }
}
