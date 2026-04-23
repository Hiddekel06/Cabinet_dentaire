<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 12mm 10mm; }
        body { font-family: dejavusans, sans-serif; font-size: 10pt; color: #1f2937; margin: 0; }
        .header-table, .items-table, .summary-table { width: 100%; border-collapse: collapse; }
        .header-table td { vertical-align: top; }
        .brand img { width: 34px; height: 34px; display: block; }
        .cabinet-name { font-size: 12pt; font-weight: bold; color: #0f172a; margin: 0; }
        .cabinet-subtitle { margin: 2px 0 0; font-size: 9pt; color: #334155; }
        .receipt-box { text-align: right; border: 1px solid #2563eb; border-radius: 4px; padding: 8px 10px; }
        .receipt-box .label { display: block; font-size: 8.5pt; color: #1d4ed8; text-transform: uppercase; }
        .receipt-box .value { display: block; margin-top: 4px; font-size: 12pt; font-weight: bold; color: #0f172a; }
        .meta-line { margin-top: 6px; font-size: 9pt; color: #475569; text-align: right; }
        .section-title { margin: 14px 0 6px; padding: 6px 8px; background: #eff6ff; border-left: 3px solid #2563eb; font-size: 9.5pt; font-weight: bold; color: #1d4ed8; text-transform: uppercase; }
        .items-table th, .items-table td { border: 1px solid #cbd5e1; padding: 6px; font-size: 9pt; }
        .items-table thead th { background: #e0f2fe; text-align: left; }
        .right { text-align: right; }
        .summary-table td { padding: 4px 0; font-size: 9.5pt; }
        .summary-table .label { color: #475569; }
        .summary-table .value { text-align: right; font-weight: bold; color: #0f172a; }
    </style>
</head>
<body>
<table class="header-table">
    <tr>
        <td class="brand" style="width: 42px; padding-right: 6px;">
            @if(!empty($logoDataUri))
                <img src="{{ $logoDataUri }}" alt="Logo cabinet" width="34" height="34">
            @endif
        </td>
        <td>
            <p class="cabinet-name">{{ $cabinetName }}</p>
            <p class="cabinet-subtitle">Cabinet dentaire</p>
            <p class="cabinet-subtitle">{{ $cabinetAddress }}</p>
            <p class="cabinet-subtitle">Téléphone : {{ $cabinetPhone }}</p>
        </td>
        <td style="width: 220px;">
            <div class="receipt-box">
                <span class="label">Reçu de séance</span>
                <span class="value">{{ $receipt->receipt_number }}</span>
            </div>
            <div class="meta-line">Date : {{ $receipt->issue_date?->format('d/m/Y') }}</div>
        </td>
    </tr>
</table>

<div class="section-title">Patient et séance</div>
<table class="items-table">
    <tbody>
        <tr>
            <td style="width: 25%; font-weight: bold; background: #f8fafc;">Patient</td>
            <td>{{ $patientName ?: '-' }}</td>
            <td style="width: 25%; font-weight: bold; background: #f8fafc;">Traitement</td>
            <td>{{ $receipt->patientTreatment?->name ?: '-' }}</td>
        </tr>
        <tr>
            <td style="font-weight: bold; background: #f8fafc;">Date séance</td>
            <td>{{ $receipt->medicalRecord?->date ? \Carbon\Carbon::parse($receipt->medicalRecord->date)->format('d/m/Y') : '-' }}</td>
            <td style="font-weight: bold; background: #f8fafc;">Référence séance</td>
            <td>#{{ $receipt->medical_record_id }}</td>
        </tr>
    </tbody>
</table>

<div class="section-title">Actes réalisés</div>
<table class="items-table">
    <thead>
        <tr>
            <th style="width: 40%;">Acte</th>
            <th style="width: 15%;" class="right">Quantité</th>
            <th style="width: 20%;" class="right">Prix unitaire</th>
            <th class="right">Sous-total</th>
        </tr>
    </thead>
    <tbody>
    @foreach($receipt->items as $item)
        <tr>
            <td>{{ $item->dentalAct?->name ?: 'Acte' }}</td>
            <td class="right">{{ $item->quantity }}</td>
            <td class="right">{{ number_format((float) $item->unit_price, 0, ',', ' ') }} FCFA</td>
            <td class="right">{{ number_format((float) $item->line_total, 0, ',', ' ') }} FCFA</td>
        </tr>
    @endforeach
    </tbody>
</table>

<table class="summary-table" style="margin-top: 12px;">
    <tr>
        <td class="label" style="width: 70%;">Total de la séance</td>
        <td class="value">{{ number_format((float) $receipt->total_amount, 0, ',', ' ') }} FCFA</td>
    </tr>
</table>
</body>
</html>
