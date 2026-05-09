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

        .cabinet-subtitle {
             font-size: 12pt;
            font-weight: bold;
            color: #0f172a;
            margin: 0;
            line-height: 1.1;
            white-space: nowrap;
        }

        .cabinet-subtitle-secondary {
             font-size: 10pt;
            color: #334155;
            margin: 2px 0 0;
        }

        .cabinet-name {
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
            padding: 8px 6px;
            font-size: 9.5pt;
        }

        .invoice-table thead th {
            background: #e0f2fe;
            color: #0f172a;
            text-align: center;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9pt;
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
            padding-right: 12px;
        }

        .summary-table .total-value {
            border: 2px solid #0f172a;
            background: #f8fafc;
            font-weight: bold;
            text-align: right;
            font-size: 12pt;
            padding: 8px 10px;
            width: 160px;
        }

        .notes-section {
            margin-top: 15px;
            font-size: 9pt;
            color: #475569;
        }

        .notes-title {
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 4px;
        }

        .notes-content {
            padding: 8px;
            border: 1px dashed #cbd5e1;
            border-radius: 4px;
            background: #fdfdfd;
        }

        .signature-table td {
            vertical-align: top;
            padding-top: 30px;
        }

        .signature-line {
            margin-top: 10px;
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
                <p class="cabinet-subtitle">Cabinet Dentaire</p>
                <p class="cabinet-subtitle">{{ $cabinetName }}</p>               
                <p class="cabinet-name">{{ $cabinetAddress }}</p>
                <p class="cabinet-name">Téléphone : {{ $cabinetPhone }}</p>
            </td>
            <td class="header-meta">
                <div class="invoice-box">
                    <span class="label">Facture</span>
                    <span class="number">N° {{ $invoiceNumber }}</span>
                </div>
                <div class="meta-line">Date : {{ $issueDate }}</div>
            </td>
        </tr>
    </table>

    <div class="section-title">Informations Patient</div>
    <table class="info-table">
        <tr>
            <td class="label-cell">Nom complet</td>
            <td style="width: 26%;">{{ $patientName }}</td>
            <td class="label-cell">Téléphone</td>
            <td>{{ $patientPhone ?: '-' }}</td>
        </tr>
    </table>

    <div class="section-title">Détail des Soins</div>
    <table class="invoice-table">
        <thead>
            <tr>
                <th style="width: 10%;">Dent</th>
                <th>Traitement / Soin effectué</th>
                <th style="width: 18%;">Indice</th>
                <th style="width: 20%; text-align: right;">Montant (XOF)</th>
            </tr>
        </thead>
        <tbody>
            @forelse($items as $item)
                <tr>
                    <td class="text-center font-bold" style="color: #1d4ed8;">{{ $item['dent'] ?: '-' }}</td>
                    <td>{{ $item['acte'] }}</td>
                    <td class="text-center muted">{{ $item['indice'] ?: '-' }}</td>
                    <td class="text-right font-bold">{{ number_format((float) $item['montant'], 0, ',', ' ') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="4" class="text-center muted">Aucun soin enregistré sur cette facture.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <table class="summary-table" style="margin-top: 15px;">
        <tr>
            <td class="total-label uppercase" style="font-size: 9pt; color: #64748b;">Montant Total Facturé</td>
            <td class="total-value">{{ number_format($totalAmount, 0, ',', ' ') }} XOF</td>
        </tr>
    </table>

    @if(!empty($notes))
    <div class="notes-section">
        <div class="notes-title">Notes complémentaires :</div>
        <div class="notes-content italic">
            {{ $notes }}
        </div>
    </div>
    @endif

    <table class="signature-table" style="margin-top: 30px;">
        <tr>
            <td style="width: 50%;">
                <!-- Espace vide à gauche -->
            </td>
            <td style="width: 50%; text-align: right;">
                <div class="muted" style="font-size: 9pt; font-weight: bold; margin-bottom: 40px;">Cachet et Signature du Medecin</div>
                <div class="signature-line" style="margin-left: auto;"></div>
            </td>
        </tr>
    </table>
</div>
</body>
</html>
