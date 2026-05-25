<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;

// Authenticate as user 2
auth()->loginUsingId(2);

// Create an appointment for patient 1
$appointment = \App\Models\Appointment::create([
    'patient_id' => 1,
    'dentist_id' => 2,
    'assigned_doctor_id' => 2,
    'appointment_date' => now(),
    'appointment_time_specified' => true,
    'status' => 'pending',
    'reason' => 'Test appointment flow',
    'notes' => 'Created by test script'
]);

// Now create a medical record referencing this appointment and include amount_collected
$request = Request::create('/api/medical-records', 'POST', [
    'patient_id' => 1,
    'appointment_id' => $appointment->id,
    'treatment_performed' => 'Treatment from appointment',
    'diagnosis' => 'appt test',
    'observations' => 'obs',
    'appointment_notes' => 'note',
    'amount_collected' => 80.25,
]);

$request->setUserResolver(function () { return \App\Models\User::find(2); });

$controller = app()->make(\App\Http\Controllers\MedicalRecordController::class);
$response = $controller->store($request);

$status = method_exists($response, 'getStatusCode') ? $response->getStatusCode() : null;
$content = method_exists($response, 'getContent') ? $response->getContent() : json_encode($response);

$mr = json_decode($content, true);
$mrId = $mr['id'] ?? null;

$appointmentFresh = \App\Models\Appointment::find($appointment->id);
$receipt = $mrId ? \App\Models\SessionReceipt::where('medical_record_id', $mrId)->first() : null;

$result = [
    'appointment_created' => $appointment->toArray(),
    'appointment_after_mr' => $appointmentFresh ? $appointmentFresh->toArray() : null,
    'medical_record_response_status' => $status,
    'medical_record' => $mr,
    'receipt' => $receipt ? $receipt->toArray() : null,
];

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
