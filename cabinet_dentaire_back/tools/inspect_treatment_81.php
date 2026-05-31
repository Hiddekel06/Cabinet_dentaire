<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\MedicalRecord;
use App\Models\SessionReceipt;

$treatmentId = 81;

$records = MedicalRecord::query()
    ->where('patient_treatment_id', $treatmentId)
    ->orderBy('date')
    ->get(['id', 'date', 'amount_collected', 'patient_id', 'patient_treatment_id']);

$receipts = SessionReceipt::query()
    ->where('patient_treatment_id', $treatmentId)
    ->orderBy('issue_date')
    ->get(['id', 'receipt_number', 'issue_date', 'total_amount', 'medical_record_id', 'patient_treatment_id', 'patient_id', 'status']);

echo "MedicalRecords\n";
foreach ($records as $record) {
    echo sprintf("MR %d | date=%s | amount=%s\n", $record->id, $record->date, number_format((float) $record->amount_collected, 0, ',', ' '));
}

echo "\nSessionReceipts\n";
foreach ($receipts as $receipt) {
    echo sprintf("SR %d | %s | date=%s | amount=%s | mr=%s | status=%s | patient=%s\n", $receipt->id, $receipt->receipt_number, $receipt->issue_date, number_format((float) $receipt->total_amount, 0, ',', ' '), var_export($receipt->medical_record_id, true), $receipt->status, $receipt->patient_id);
}
