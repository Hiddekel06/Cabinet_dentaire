<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;

class DentalActsTemplateSeeder extends Seeder
{
    /**
     * Génère un fichier Excel template pour les actes dentaires
     */
    public function run(): void
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Définir le titre de la feuille
        $sheet->setTitle('Actes Dentaires');
        
        // En-têtes
        $headers = ['code', 'name', 'category', 'tarif', 'description'];
        $sheet->fromArray($headers, null, 'A1');
        
        // Formater les en-têtes
        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 12,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
        ];
        $sheet->getStyle('A1:E1')->applyFromArray($headerStyle);
        
        // Exemples de données
        $data = [
            ['D5', 'Détartrage', 'Nettoyage', 25000, 'Détartrage complet des dents'],
            ['D10', 'Détection cavité', 'Diagnostic', 5000, 'Examen et détection de caries'],
            ['D15', 'Extraction simple', 'Chirurgie', 15000, 'Extraction d\'une dent simple'],
            ['D20', 'Plombage', 'Restauration', 20000, 'Obturation composite'],
            ['D25', 'Consultation', 'Diagnostic', 10000, 'Consultation dentaire générale'],
            ['D30', 'Radiographie', 'Imagerie', 8000, 'Radiographie dentaire'],
            ['D35', 'Blanchiment', 'Esthétique', 50000, 'Blanchiment dentaire professionnel'],
            ['D40', 'Couronne', 'Prothèse', 80000, 'Pose de couronne dentaire'],
            ['D45', 'Bridge', 'Prothèse', 120000, 'Pose de bridge'],
            ['D50', 'Implant', 'Chirurgie', 150000, 'Pose d\'implant dentaire'],
            ['D55', 'Détartrage profond', 'Nettoyage', 35000, 'Détartrage sous-gingival'],
            ['D60', 'Traitement canal', 'Endodontie', 45000, 'Traitement de canal radiculaire'],
            ['D65', 'Extraction complexe', 'Chirurgie', 25000, 'Extraction dent de sagesse'],
            ['D70', 'Orthodontie consultation', 'Orthodontie', 15000, 'Consultation orthodontique'],
            ['D75', 'Appareil dentaire', 'Orthodontie', 200000, 'Pose appareil orthodontique complet'],
        ];
        
        $sheet->fromArray($data, null, 'A2');
        
        // Formater les données
        $dataStyle = [
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CCCCCC'],
                ],
            ],
        ];
        $sheet->getStyle('A2:E' . (count($data) + 1))->applyFromArray($dataStyle);
        
        // Alterner les couleurs de lignes
        for ($i = 2; $i <= count($data) + 1; $i++) {
            if ($i % 2 == 0) {
                $sheet->getStyle("A$i:E$i")->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setRGB('F2F2F2');
            }
        }
        
        // Centrer les colonnes code et tarif
        $sheet->getStyle('A2:A' . (count($data) + 1))
            ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('D2:D' . (count($data) + 1))
            ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        
        // Auto-dimensionner les colonnes
        foreach (range('A', 'E') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        
        // Figer la première ligne
        $sheet->freezePane('A2');
        
        // Ajouter des instructions en bas
        $instructionRow = count($data) + 3;
        $sheet->setCellValue("A$instructionRow", "📝 Instructions :");
        $sheet->getStyle("A$instructionRow")->getFont()->setBold(true)->setSize(11);
        
        $instructions = [
            "• code : Code unique de l'acte (ex: D5, D10, etc.)",
            "• name : Nom de l'acte dentaire",
            "• category : Catégorie (Nettoyage, Diagnostic, Chirurgie, etc.)",
            "• tarif : Montant en FCFA (nombre entier)",
            "• description : Description détaillée de l'acte",
            "",
            "⚠️ Le code doit être UNIQUE pour chaque acte",
            "✅ Vous pouvez modifier les lignes existantes ou en ajouter de nouvelles",
        ];
        
        foreach ($instructions as $index => $instruction) {
            $sheet->setCellValue("A" . ($instructionRow + $index + 1), $instruction);
            $sheet->getStyle("A" . ($instructionRow + $index + 1))
                ->getFont()->setSize(9)->getColor()->setRGB('666666');
        }
        
        // Sauvegarder le fichier
        $filePath = storage_path('app/public/dental_acts_template.xlsx');
        
        // Créer le dossier si nécessaire
        if (!file_exists(storage_path('app/public'))) {
            mkdir(storage_path('app/public'), 0755, true);
        }
        
        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);
        
        $this->command->info("✅ Template Excel créé avec succès !");
        $this->command->info("📁 Fichier : $filePath");
        $this->command->info("🔗 URL : " . url('storage/dental_acts_template.xlsx'));
    }
}
