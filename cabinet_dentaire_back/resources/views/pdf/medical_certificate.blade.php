<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            margin: 12mm 12mm;
        }

        body {
            font-family: dejavusans, sans-serif;
            font-size: 11pt;
            color: #1f2937;
            margin: 0;
            padding: 0;
        }

        .header-wrap {
            text-align: center;
            margin-bottom: 6px;
        }

        .brand {
            margin: 0 auto 6px;
        }

        .brand img {
            width: 64px;
            height: 64px;
            display: block;
            margin: 0 auto;
        }

        .cabinet-name {
            font-size: 12pt;
            font-weight: bold;
            margin: 0;
            color: #0f172a;
        }

        .cabinet-subtitle {
            margin: 2px 0 0;
            font-size: 9.5pt;
            color: #334155;
        }

        .title {
            margin: 22px 0 14px;
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #0f172a;
            text-decoration: underline;
        }

        .certificate-body {
            width: 82%;
            margin: 0 auto;
            line-height: 1.75;
            font-size: 11.2pt;
            text-align: left;
        }

        .text-center {
            text-align: center;
        }

        .strong {
            font-weight: bold;
        }

        .spacer {
            height: 8px;
        }

        .signature-wrap {
            width: 82%;
            margin: 36px auto 0;
            text-align: right;
        }

        .signature-label {
            color: #334155;
        }

    </style>
</head>
<body>
<div class="header-wrap">
    <div class="brand">
        @if(!empty($logoDataUri))
            <img src="{{ $logoDataUri }}" alt="Logo cabinet" width="64" height="64">
        @endif
    </div>
    <p class="cabinet-name">{{ $cabinetName }}</p>
    <p class="cabinet-subtitle">Cabinet dentaire</p>
    <p class="cabinet-subtitle">Adresse : {{ $cabinetAddress }}</p>
    <p class="cabinet-subtitle">Téléphone : {{ $cabinetPhone }}</p>
</div>

<div class="title">Certificat médical</div>

<div class="certificate-body">
    <p>
        Je soussigné(e), Dr <span class="strong">{{ $doctorName }}</span>,
        Chirurgien-Dentiste exerçant au Cabinet Dentaire
        <span class="strong">{{ $cabinetName }}</span>,
        atteste que :
    </p>

    <div class="spacer"></div>

    <p class="text-center strong">M./Mme {{ $personName }}</p>

    <div class="spacer"></div>

    <p>
        est passé(e) en consultation dans notre établissement ce jour,
        le <span class="strong">{{ $issueDate }}</span>
        @if(!empty($consultationTime))
            à <span class="strong">{{ $consultationTime }}</span>
        @endif.
    </p>

    <p>
        Son état de santé nécessite un repos médical de
        <span class="strong">{{ $restDays ?: '-' }}</span> jour(s),
        à compter du <span class="strong">{{ $restStartDate ?: '-' }}</span>.
    </p>

    <p>
        Le présent certificat est délivré à la demande de l'intéressé(e)
        pour servir et valoir ce que de droit.
    </p>
</div>

<div class="signature-wrap">
    <div class="signature-label">Signature et cachet du médecin</div>
</div>
</body>
</html>
