<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            margin: 12mm 10mm;
        }

        body {
            font-family: dejavusans, sans-serif;
            font-size: 10.5pt;
            color: #1f2937;
            margin: 0;
            padding: 0;
        }

        .page {
            width: 100%;
        }

        .header-table,
        .info-table,
        .invoice-table,
        .summary-table,
        .signature-table {
            width: 100%;
            border-collapse: collapse;
        }

        .header-table td {
            vertical-align: top;
        }

        .brand {
            width: 42px;
            padding-right: 6px;
        }

        .brand img {
            width: 30px;
            height: 30px;
            display: block;
        }

        .header-main {
            width: auto;
        }

        .header-meta {
            width: 220px;
        }

        .cabinet-name {
            font-size: 12pt;
            font-weight: bold;
            color: #0f172a;
            margin: 0;
            line-height: 1.1;
            white-space: nowrap;
        }

        .cabinet-subtitle {
            margin: 2px 0 0;
            font-size: 10pt;
            color: #334155;
        }

        .invoice-box {
            text-align: right;
            border: 1px solid #1d4ed8;
            padding: 8px 10px;
            border-radius: 4px;
        }

        .invoice-box .label {
            display: block;
            font-size: 9pt;
            color: #1d4ed8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .invoice-box .number {
            display: block;
            margin-top: 4px;
            font-size: 14pt;
            font-weight: bold;
            color: #0f172a;
        }

        .meta-line {
            margin-top: 6px;
            font-size: 9.5pt;
            color: #475569;
        }

        .section-title {
            margin: 14px 0 6px;
            padding: 6px 8px;
            background: #eff6ff;
            border-left: 3px solid #2563eb;
            font-size: 10pt;
            font-weight: bold;
            color: #1d4ed8;
            text-transform: uppercase;
        }

        .info-table td {
            padding: 4px 6px;
            border: 1px solid #cbd5e1;
        }

        .info-table .label-cell {
            width: 24%;
            background: #f8fafc;
            font-weight: bold;
        }

        .invoice-table th,
        .invoice-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 6px;
            font-size: 9.5pt;
        }

        .invoice-table thead th {
            background: #e0f2fe;
            color: #0f172a;
            text-align: left;
            font-weight: bold;
        }

        .invoice-table tbody tr {
            page-break-inside: avoid;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .summary-table td {
            padding: 5px 6px;
        }

        .summary-table .total-label {
            text-align: right;
            font-weight: bold;
            font-size: 11pt;
        }

        .summary-table .total-value {
            border: 1px solid #0f172a;
            font-weight: bold;
            text-align: right;
            font-size: 11pt;
            padding: 6px 8px;
        }

        .notes-box {
            min-height: 40px;
            border: 1px solid #cbd5e1;
            padding: 8px;
            font-size: 9.5pt;
            color: #334155;
        }

        .signature-table td {
            vertical-align: top;
            padding-top: 8px;
        }

        .signature-line {
            margin-top: 26px;
            border-top: 1px solid #0f172a;
            width: 72%;
        }

        .muted {
            color: #64748b;
        }
    </style>
</head>
<body>
<div class="page">
    <table class="header-table">
        <tr>
            <td class="brand">
                @if(!empty($logoDataUri))
                    <img src="{{ $logoDataUri }}" alt="Logo cabinet" width="30" height="30">
                @endif
            </td>
            <td class="header-main">
                <p class="cabinet-name">{{ $cabinetName }}</p>
                <p class="cabinet-subtitle">Cabinet Dentaire</p>
                <p class="cabinet-subtitle">{{ $cabinetAddress }}</p>
                <p class="cabinet-subtitle">Téléphone : {{ $cabinetPhone }}</p>
            </td>
            <td class="header-meta">
                <div class="invoice-box">
                    <span class="label">Facture</span>
                    <span class="number">N° {{ $invoiceNumber }}</span>
                </div>
                <div class="meta-line">Date : {{ $issueDate }}</div>
                <div class="meta-line">Échéance : {{ $dueDate }}</div>
            </td>
        </tr>
    </table>

    <div class="section-title">Patient</div>
    <table class="info-table">
        <tr>
            <td class="label-cell">Nom patient</td>
            <td>{{ $patientName }}</td>
            <td class="label-cell">Téléphone</td>
            <td>{{ $patientPhone ?: '-' }}</td>
        </tr>
    </table>

    <div class="section-title">Détail des actes</div>
    <table class="invoice-table">
        <thead>
            <tr>
                <th style="width: 22%;">Patient</th>
                <th style="width: 16%;">Date</th>
                <th>Acte (libellé)</th>
                <th style="width: 14%;">Indice (code)</th>
                <th style="width: 16%;" class="text-right">Montant (FCFA)</th>
            </tr>
        </thead>
        <tbody>
            @forelse($items as $item)
                <tr>
                    <td>{{ $item['patient_name'] }}</td>
                    <td>{{ $item['date'] }}</td>
                    <td>{{ $item['acte'] }}</td>
                    <td>{{ $item['indice'] }}</td>
                    <td class="text-right">{{ number_format((float) $item['montant'], 0, ',', ' ') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" class="text-center muted">Aucun acte disponible.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <table class="summary-table" style="margin-top: 8px;">
        <tr>
            <td style="width: 72%;" class="total-label">Total</td>
            <td class="total-value">{{ number_format($totalAmount, 0, ',', ' ') }} FCFA</td>
        </tr>
        <tr>
            <td class="total-label">Montant payé</td>
            <td class="total-value">{{ number_format($paidAmount, 0, ',', ' ') }} FCFA</td>
        </tr>
        <tr>
            <td class="total-label">Reste à payer</td>
            <td class="total-value">{{ number_format($remainingAmount, 0, ',', ' ') }} FCFA</td>
        </tr>
    </table>

    <table class="signature-table" style="margin-top: 16px;">
        <tr>
            <td style="width: 50%;">
                <div class="muted">Signature du patient</div>
                <div class="signature-line"></div>
            </td>
            <td style="width: 50%; text-align: right;">
                <div class="muted">Signature et cachet du médecin</div>
                <div class="signature-line" style="margin-left: auto;"></div>
            </td>
        </tr>
    </table>
</div>
</body>
</html>
