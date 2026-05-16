<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 15mm 15mm; }
        body { font-family: dejavusans, sans-serif; font-size: 10pt; color: #334155; line-height: 1.4; }
        .header { text-align: center; border-bottom: 2px solid #3b82f6; pb: 10px; margin-bottom: 20px; }
        .cabinet-name { font-size: 18pt; font-weight: bold; color: #1e3a8a; margin: 0; }
        .doc-title { font-size: 14pt; font-weight: bold; text-transform: uppercase; color: #3b82f6; margin-top: 5px; }
        
        .section { margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 5px; overflow: hidden; }
        .section-header { background: #f1f5f9; padding: 5px 10px; font-weight: bold; color: #1e40af; border-bottom: 1px solid #e2e8f0; font-size: 9pt; text-transform: uppercase; }
        .section-content { padding: 10px; background: #ffffff; }
        
        .grid { width: 100%; border-collapse: collapse; }
        .grid td { padding: 5px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .label { font-weight: bold; color: #64748b; width: 30%; font-size: 8pt; text-transform: uppercase; }
        .value { color: #1e293b; font-weight: 500; }
        
        .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 5px; }
        .badge { display: inline-block; padding: 2px 8px; background: #dcfce7; color: #166534; border-radius: 10px; font-size: 8pt; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <p class="cabinet-name">{{ $cabinetName }}</p>
        <p style="margin: 0; font-size: 9pt;">{{ $cabinetAddress }} | {{ $cabinetPhone }}</p>
        <p class="doc-title">Observation Clinique & Anamnèse</p>
    </div>

    <table class="grid" style="margin-bottom: 20px;">
        <tr>
            <td class="label">Patient</td>
            <td class="value" style="font-size: 11pt;">{{ $observation->patient->first_name }} {{ $observation->patient->last_name }}</td>
            <td class="label">Date de l'examen</td>
            <td class="value">{{ \Carbon\Carbon::parse($observation->date)->format('d/m/Y') }}</td>
        </tr>
        <tr>
            <td class="label">Âge / Sexe</td>
            <td class="value">{{ \Carbon\Carbon::parse($observation->patient->date_of_birth)->age }} ans | {{ $observation->patient->gender }}</td>
            <td class="label">Praticien</td>
            <td class="value">Dr. {{ $observation->creator->name }}</td>
        </tr>
    </table>

    <div class="section">
        <div class="section-header">1. Motif & Histoire de la maladie</div>
        <div class="section-content">
            <p><strong>Motif :</strong> {{ $observation->reason_for_consultation ?: 'N/A' }}</p>
            <p><strong>Histoire :</strong> {{ $observation->history_of_illness ?: 'N/A' }}</p>
        </div>
    </div>

    <div class="section">
        <div class="section-header">2. Antécédents (ATCD)</div>
        <div class="section-content">
            <table class="grid">
                <tr>
                    <td class="label">Personnels Médicaux</td>
                    <td class="value">{{ $observation->atcd_personal_med ?: '-' }}</td>
                </tr>
                <tr>
                    <td class="label">Personnels Chirurgicaux</td>
                    <td class="value">{{ $observation->atcd_personal_chir ?: '-' }}</td>
                </tr>
                <tr>
                    <td class="label">Familiaux</td>
                    <td class="value">Méd: {{ $observation->atcd_family_med ?: '-' }} | Chir: {{ $observation->atcd_family_chir ?: '-' }}</td>
                </tr>
            </table>
        </div>
    </div>

    <div class="section">
        <div class="section-header">3. Paramètres Vitaux</div>
        <div class="section-content">
            <table class="grid">
                <tr>
                    <td class="label">Conscience</td>
                    <td class="value">{{ $observation->consciousness ?: '-' }}</td>
                    <td class="label">Tension (TA)</td>
                    <td class="value">{{ $observation->blood_pressure ?: '-' }} mmHg</td>
                </tr>
                <tr>
                    <td class="label">Pouls</td>
                    <td class="value">{{ $observation->pulse ?: '-' }} bpm</td>
                    <td class="label">Température</td>
                    <td class="value">{{ $observation->temperature ?: '-' }} °C</td>
                </tr>
                <tr>
                    <td class="label">Poids</td>
                    <td class="value">{{ $observation->weight ?: '-' }} Kg</td>
                    <td class="label">Dextro</td>
                    <td class="value">{{ $observation->blood_sugar ?: '-' }}</td>
                </tr>
            </table>
        </div>
    </div>

    <div class="section">
        <div class="section-header">4. Examen Physique (Par appareil)</div>
        <div class="section-content">
            <table class="grid">
                @if($observation->physical_exam_cardio) <tr><td class="label">Cardio</td><td class="value">{{ $observation->physical_exam_cardio }}</td></tr> @endif
                @if($observation->physical_exam_pulmonary) <tr><td class="label">Pulmonaire</td><td class="value">{{ $observation->physical_exam_pulmonary }}</td></tr> @endif
                @if($observation->physical_exam_neurological) <tr><td class="label">Neuro</td><td class="value">{{ $observation->physical_exam_neurological }}</td></tr> @endif
                @if($observation->physical_exam_digestive) <tr><td class="label">Digestif</td><td class="value">{{ $observation->physical_exam_digestive }}</td></tr> @endif
            </table>
        </div>
    </div>

    <div class="section" style="border: 2px solid #3b82f6;">
        <div class="section-header" style="background: #3b82f6; color: white;">5. Synthèse & Conclusion</div>
        <div class="section-content">
            <p><strong>Résumé Syndromique :</strong> {{ $observation->syndromic_summary ?: 'N/A' }}</p>
            <p><strong>Hypothèses Diagnostiques :</strong> {{ $observation->diagnostic_hypotheses ?: 'N/A' }}</p>
            <p style="color: #1e40af; font-weight: bold;">Diagnostic Positif : {{ $observation->positive_diagnostic ?: 'En attente' }}</p>
        </div>
    </div>

    <div class="section">
        <div class="section-header">6. Plan de soins & Examens complémentaires</div>
        <div class="section-content">
            <p><strong>Examens :</strong> {{ $observation->tests_biology }} {{ $observation->tests_imaging }}</p>
            <p><strong>Traitements :</strong> {{ $observation->treatments ?: 'N/A' }}</p>
        </div>
    </div>

    <div class="footer">
        Document généré le {{ date('d/m/Y H:i') }} - Réf: OBS-{{ $observation->id }} - {{ $cabinetName }}
    </div>
</body>
</html>
