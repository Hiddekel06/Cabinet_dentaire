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

        .header-table,
        .patient-table,
        .items-table {
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
            width: 210px;
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
            font-size: 9.5pt;
            color: #334155;
        }

        .ordonnance-box {
            text-align: right;
            border: 1px solid #2563eb;
            border-radius: 4px;
            padding: 8px 10px;
        }

        .ordonnance-box .label {
            display: block;
            font-size: 9pt;
            color: #1d4ed8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .ordonnance-box .value {
            display: block;
            margin-top: 4px;
            font-size: 13pt;
            font-weight: bold;
            color: #0f172a;
        }

        .meta-line {
            margin-top: 6px;
            font-size: 9.5pt;
            color: #475569;
            text-align: right;
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

        .patient-table td {
            padding: 5px 6px;
            border: 1px solid #cbd5e1;
        }

        .patient-table .label {
            width: 22%;
            background: #f8fafc;
            font-weight: bold;
        }

        .items-table th,
        .items-table td {
            border: 1px solid #cbd5e1;
            padding: 6px;
            font-size: 9.5pt;
            vertical-align: top;
        }

        .items-table thead th {
            background: #e0f2fe;
            color: #0f172a;
            text-align: left;
            font-weight: bold;
        }

        .items-table tbody tr {
            page-break-inside: avoid;
        }

        .muted {
            color: #64748b;
        }

        .notes-box {
            min-height: 28px;
            border: 1px solid #cbd5e1;
            padding: 8px;
            font-size: 9.5pt;
            color: #334155;
            line-height: 1.4;
        }

    </style>
</head>
<body>
<table class="header-table">
    <tr>
        <td class="brand">
            @if(!empty($logoDataUri))
                <img src="{{ $logoDataUri }}" alt="Logo cabinet" width="30" height="30">
            @endif
        </td>
        <td class="header-main">
            <p class="cabinet-name">{{ $cabinetName }}</p>
            <p class="cabinet-subtitle">Cabinet dentaire</p>
            <p class="cabinet-subtitle">{{ $cabinetAddress }}</p>
            <p class="cabinet-subtitle">Téléphone : {{ $cabinetPhone }}</p>
        </td>
        <td class="header-meta">
            <div class="ordonnance-box">
                <span class="label">Ordonnance</span>
                <span class="value">N° {{ $ordonnanceId }}</span>
            </div>
            <div class="meta-line">Date : {{ $issueDate }}</div>
        </td>
    </tr>
</table>

<div class="section-title">Patient</div>
<table class="patient-table">
    <tr>
        <td class="label">Nom complet</td>
        <td>{{ $patientFullName }}</td>
        <td class="label">Praticien</td>
        <td>{{ $doctorName ?: '-' }}</td>
    </tr>
</table>

<div class="section-title">Prescription</div>
<table class="items-table">
    <thead>
    <tr>
        <th style="width: 28%;">Médicament</th>
        <th style="width: 20%;">Fréquence</th>
        <th style="width: 18%;">Durée</th>
        <th>Instructions</th>
    </tr>
    </thead>
    <tbody>
    @forelse($items as $item)
        <tr>
            <td>{{ $item['medication_name'] }}</td>
            <td>{{ $item['frequency'] }}</td>
            <td>{{ $item['duration'] ?: '-' }}</td>
            <td>{{ $item['instructions'] ?: '-' }}</td>
        </tr>
    @empty
        <tr>
            <td colspan="4" class="muted" style="text-align:center;">Aucun médicament renseigné.</td>
        </tr>
    @endforelse
    </tbody>
</table>

@if(!empty($notes))
    <div class="section-title">Notes</div>
    <div class="notes-box">{{ $notes }}</div>
@endif

<table style="width: 100%; margin-top: 14px;">
    <tr>
        <td style="width: 50%;"></td>
        <td style="width: 50%; text-align: right;">
            <div class="muted">Signature et cachet du médecin</div>
            <div style="margin-top: 30px; border-top: 1px solid #0f172a; width: 72%; margin-left: auto;"></div>
        </td>
    </tr>
</table>
</body>
</html>
