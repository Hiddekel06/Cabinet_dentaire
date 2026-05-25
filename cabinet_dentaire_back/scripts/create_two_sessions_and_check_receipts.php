<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;

function createMedicalRecord(array $data, int $userId = 2) {
    auth()->loginUsingId($userId);

    $request = Request::create('/api/medical-records', 'POST', $data);
    $request->setUserResolver(function () use ($userId) {
        return \App\Models\User::find($userId);
    });

    $controller = app()->make(\App\Http\Controllers\MedicalRecordController::class);
    $response = $controller->store($request);

    $status = method_exists($response, 'getStatusCode') ? $response->getStatusCode() : null;
    $content = method_exists($response, 'getContent') ? $response->getContent() : json_encode($response);


    return [
        'status' => $status,
        'content' => $content,
    ];
}

$tests = [
    [
        'patient_id' => 1,
        'treatment_performed' => 'Séance test A (avec montant)',
        'diagnosis' => 'test A',
        'observations' => 'obs A',
        'appointment_notes' => 'note A',
        'amount_collected' => 50.75,
    ],
    [
        'patient_id' => 1,
        'treatment_performed' => 'Séance test B (sans montant)',
        'diagnosis' => 'test B',
        'observations' => 'obs B',
        'appointment_notes' => 'note B',
        // no amount_collected key -> null
    ],
];

$results = [];
foreach ($tests as $i => $data) {
    $r = createMedicalRecord($data);
    $payload = json_decode($r['content'], true);
    $mrId = $payload['id'] ?? null;

    $receipt = null;
    if ($mrId) {
        $receipt = \App\Models\SessionReceipt::where('medical_record_id', $mrId)->first();
    }

    $results[] = [
        'test_index' => $i,
        'status' => $r['status'],
        'medical_record_id' => $mrId,
        'receipt' => $receipt ? $receipt->toArray() : null,
        'response' => $payload,
    ];
}

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
