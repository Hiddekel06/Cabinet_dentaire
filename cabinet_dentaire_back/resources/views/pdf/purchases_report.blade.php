<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 14mm 10mm; }

        body {
            font-family: dejavusans, sans-serif;
            font-size: 10pt;
            color: #1f2937;
            margin: 0;
            padding: 0;
        }

        /* ── HEADER ─────────────────────────────────────────── */
        .header-table { width: 100%; border-collapse: collapse; }
        .header-table td { vertical-align: top; }

        .brand { width: 44px; padding-right: 6px; }
        .brand img { width: 36px; height: 36px; display: block; }

        .cabinet-subtitle { font-size: 12pt; font-weight: bold; color: #0f172a; margin: 0; line-height: 1.2; }
        .cabinet-info     { font-size: 9pt; color: #334155; margin: 2px 0 0; }

        .report-box {
            text-align: right;
            border: 1px solid #0369a1;
            border-radius: 4px;
            padding: 8px 10px;
        }
        .report-box .label {
            display: block;
            font-size: 8.5pt;
            color: #0369a1;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .report-box .title {
            display: block;
            margin-top: 3px;
            font-size: 13pt;
            font-weight: bold;
            color: #0f172a;
        }
        .meta-line { margin-top: 5px; font-size: 9pt; color: #475569; text-align: right; }

        /* ── DIVIDER ────────────────────────────────────────── */
        .divider { border: none; border-top: 1.5px solid #0369a1; margin: 12px 0; }

        /* ── FILTER SUMMARY ─────────────────────────────────── */
        .filter-bar {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 4px;
            padding: 6px 10px;
            font-size: 8.5pt;
            color: #0c4a6e;
            margin-bottom: 12px;
        }
        .filter-bar strong { font-weight: bold; }

        /* ── SECTION TITLE ──────────────────────────────────── */
        .section-title {
            margin: 14px 0 6px;
            padding: 5px 8px;
            background: #e0f2fe;
            border-left: 3px solid #0284c7;
            font-size: 9.5pt;
            font-weight: bold;
            color: #0369a1;
            text-transform: uppercase;
        }

        /* ── MAIN TABLE ─────────────────────────────────────── */
        .purchases-table { width: 100%; border-collapse: collapse; }
        .purchases-table th,
        .purchases-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 7px;
            font-size: 9pt;
        }
        .purchases-table thead th {
            background: #e0f2fe;
            color: #0f172a;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 8.5pt;
            text-align: center;
        }
        .purchases-table tbody tr:nth-child(even) td { background: #f8fafc; }

        .type-badge {
            display: inline-block;
            padding: 2px 7px;
            border-radius: 20px;
            font-size: 8pt;
            font-weight: bold;
            background: #dbeafe;
            color: #1d4ed8;
        }

        .text-right  { text-align: right; }
        .text-center { text-align: center; }
        .font-bold   { font-weight: bold; }
        .muted       { color: #64748b; }

        /* ── TOTALS ─────────────────────────────────────────── */
        .totals-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        .totals-table td { padding: 5px 6px; }
        .totals-table .total-label {
            text-align: right;
            font-weight: bold;
            font-size: 10pt;
            padding-right: 12px;
            color: #334155;
        }
        .totals-table .total-value {
            border: 2px solid #0f172a;
            background: #f0f9ff;
            font-weight: bold;
            text-align: right;
            font-size: 12pt;
            padding: 7px 10px;
            width: 180px;
            color: #0369a1;
        }

        /* ── BY-TYPE SUMMARY ────────────────────────────────── */
        .by-type-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        .by-type-table th,
        .by-type-table td {
            border: 1px solid #e2e8f0;
            padding: 5px 8px;
            font-size: 9pt;
        }
        .by-type-table thead th {
            background: #f1f5f9;
            color: #334155;
            font-weight: bold;
            font-size: 8.5pt;
        }
        .by-type-table tbody tr:last-child td {
            font-weight: bold;
            background: #eff6ff;
        }

        /* ── FOOTER ─────────────────────────────────────────── */
        .footer {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            font-size: 8pt;
            color: #94a3b8;
            text-align: center;
        }
    </style>
</head>
<body>

{{-- ═══ EN-TÊTE ═══ --}}
<table class="header-table">
    <tr>
        <td class="brand">
            @if(!empty($logoDataUri))
                <img src="{{ $logoDataUri }}" alt="Logo" width="36" height="36">
            @endif
        </td>
        <td>
            <p class="cabinet-subtitle">Cabinet Dentaire</p>
            <p class="cabinet-subtitle">{{ $cabinetName }}</p>
            <p class="cabinet-info">{{ $cabinetAddress }}</p>
            <p class="cabinet-info">Téléphone : {{ $cabinetPhone }}</p>
        </td>
        <td style="width: 230px;">
            <div class="report-box">
                <span class="label">Rapport des Achats</span>
                <span class="title">Dépenses</span>
            </div>
            <div class="meta-line">Généré le : {{ $generatedAt }}</div>
        </td>
    </tr>
</table>

<hr class="divider">

{{-- ═══ FILTRE APPLIQUÉ ═══ --}}
<div class="filter-bar">
    <strong>Période&nbsp;:</strong> {{ $periodLabel }}
    @if(!empty($typeLabel))
        &nbsp;&nbsp;|&nbsp;&nbsp;<strong>Catégorie&nbsp;:</strong> {{ $typeLabel }}
    @endif
    &nbsp;&nbsp;|&nbsp;&nbsp;<strong>Achats affichés&nbsp;:</strong> {{ count($products) }}
</div>

{{-- ═══ TABLEAU DES ACHATS ═══ --}}
<div class="section-title">Détail des Achats</div>
<table class="purchases-table">
    <thead>
        <tr>
            <th style="width: 13%;">Date</th>
            <th style="width: 20%;">Catégorie</th>
            <th>Produit / Libellé</th>
            <th style="width: 8%; text-align: right;">Qté</th>
            <th style="width: 16%; text-align: right;">P.U. (XOF)</th>
            <th style="width: 17%; text-align: right;">Total (XOF)</th>
        </tr>
    </thead>
    <tbody>
        @forelse($products as $product)
            <tr>
                <td class="text-center">{{ \Carbon\Carbon::parse($product->purchase_date)->format('d/m/Y') }}</td>
                <td class="text-center">
                    <span class="type-badge">{{ $product->type->name ?? 'N/A' }}</span>
                </td>
                <td>{{ $product->name }}</td>
                <td class="text-center font-bold">{{ $product->quantity }}</td>
                <td class="text-right">{{ number_format((float)$product->unit_price, 0, ',', ' ') }}</td>
                <td class="text-right font-bold" style="color: #0369a1;">
                    {{ number_format((float)$product->total_amount, 0, ',', ' ') }}
                </td>
            </tr>
        @empty
            <tr>
                <td colspan="6" class="text-center muted" style="padding: 20px;">
                    Aucun achat trouvé pour les critères sélectionnés.
                </td>
            </tr>
        @endforelse
    </tbody>
</table>

{{-- ═══ GRAND TOTAL ═══ --}}
<table class="totals-table">
    <tr>
        <td class="total-label">Total des dépenses</td>
        <td class="total-value">{{ number_format($grandTotal, 0, ',', ' ') }} XOF</td>
    </tr>
</table>

{{-- ═══ RÉCAPITULATIF PAR CATÉGORIE ═══ --}}
@if(count($byType) > 0)
<div class="section-title" style="margin-top: 20px;">Récapitulatif par Catégorie</div>
<table class="by-type-table">
    <thead>
        <tr>
            <th>Catégorie</th>
            <th style="text-align: center;">Nombre d'achats</th>
            <th style="text-align: right;">Total (XOF)</th>
            <th style="text-align: right;">% du total</th>
        </tr>
    </thead>
    <tbody>
        @foreach($byType as $row)
            <tr>
                <td>{{ $row['type'] }}</td>
                <td style="text-align: center;">{{ $row['count'] }}</td>
                <td style="text-align: right; font-weight: bold;">
                    {{ number_format($row['total'], 0, ',', ' ') }}
                </td>
                <td style="text-align: right; color: #64748b;">
                    @if($grandTotal > 0)
                        {{ number_format(($row['total'] / $grandTotal) * 100, 1) }} %
                    @else
                        —
                    @endif
                </td>
            </tr>
        @endforeach
        {{-- Ligne total --}}
        <tr>
            <td>TOTAL</td>
            <td style="text-align: center;">{{ count($products) }}</td>
            <td style="text-align: right;">{{ number_format($grandTotal, 0, ',', ' ') }}</td>
            <td style="text-align: right;">100 %</td>
        </tr>
    </tbody>
</table>
@endif

{{-- ═══ PIED DE PAGE ═══ --}}
<div class="footer">
    Rapport généré automatiquement par le système de gestion du cabinet &mdash; {{ $cabinetName }} &mdash; {{ $generatedAt }}
</div>

</body>
</html>
