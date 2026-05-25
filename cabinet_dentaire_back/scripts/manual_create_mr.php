<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;

// Authenticate as user id 2 (exists in dev DB)
auth()->loginUsingId(2);

$request = Request::create('/api/medical-records', 'POST', [
    'patient_id' => 1,
    'treatment_performed' => 'Auto test script',
    'diagnosis' => 'test',
    'observations' => 'test',
    'appointment_notes' => 'test',
    'amount_collected' => 123.45,
]);
$request->setUserResolver(function () {
    return \App\Models\User::find(2);
});

$controller = app()->make(\App\Http\Controllers\MedicalRecordController::class);
$response = $controller->store($request);

if (method_exists($response, 'getStatusCode')) {
    echo $response->getStatusCode() . PHP_EOL;
}

if (method_exists($response, 'getContent')) {
    echo $response->getContent() . PHP_EOL;
} else {
    var_export($response);
}
