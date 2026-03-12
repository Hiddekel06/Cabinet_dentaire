<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MedicationController;
use App\Http\Controllers\MedicalRecordController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\OrdonnanceController;
use App\Http\Controllers\PatientTreatmentController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductTypeController;
use App\Http\Controllers\RadiographyController;
use App\Http\Controllers\MedicalFolderController;
use Illuminate\Support\Facades\Route;

// Routes publiques (sans protection)
Route::post('/login', [AuthController::class, 'login']);
Route::get('/dental-acts', [App\Http\Controllers\DentalActController::class, 'index']);
Route::get('/dental-acts/search', [App\Http\Controllers\DentalActController::class, 'search']);

// Routes protégées
Route::middleware(['auth:sanctum'])->group(function () {
        // Génération de certificat médical Word
        Route::post('/medical-certificates/generate', [App\Http\Controllers\MedicalCertificateController::class, 'generate']);
    Route::post('/medical-certificates/{medicalCertificate}/generate', [App\Http\Controllers\MedicalCertificateController::class, 'generateFromStored']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Gestion des actes dentaires (admin)
    Route::post('/dental-acts/import', [App\Http\Controllers\DentalActController::class, 'import']);
    Route::delete('/dental-acts/truncate', [App\Http\Controllers\DentalActController::class, 'truncate']);
    
    // Gestion des patients
    Route::apiResource('patients', PatientController::class);
    Route::get('patients/{patient}/billable-acts', [PatientController::class, 'billableActs']);
    
    // Gestion des rendez-vous
    Route::apiResource('appointments', AppointmentController::class);
    
    // Gestion des dossiers médicaux
    Route::apiResource('medical-records', MedicalRecordController::class);
    
    // Gestion des traitements patients (suivi)
    Route::apiResource('patient-treatments', PatientTreatmentController::class);
    Route::post('patient-treatments/{patientTreatment}/acts', [PatientTreatmentController::class, 'addActs']);
    
    // Gestion des radiographies
    Route::apiResource('radiographies', RadiographyController::class);

    // Gestion des achats (produits)
    Route::get('products/statistics', [ProductController::class, 'statistics']);
    Route::apiResource('products', ProductController::class);

    // Gestion des types de produits
    Route::apiResource('product-types', ProductTypeController::class);

    // Gestion des certificats médicaux
    Route::apiResource('medical-certificates', \App\Http\Controllers\MedicalCertificateController::class);

    // Gestion des ordonnances
    Route::apiResource('ordonnances', OrdonnanceController::class)->only(['index', 'store', 'show', 'destroy']);
    Route::post('ordonnances/{ordonnance}/generate', [OrdonnanceController::class, 'generate']);
    Route::get('medications/suggestions', [MedicationController::class, 'suggestions']);

    // Facturation (MVP etape 1)
    Route::get('invoices', [InvoiceController::class, 'index']);
    Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);
    Route::post('invoices', [InvoiceController::class, 'store']);
    Route::post('invoices/{invoice}/generate', [InvoiceController::class, 'generate']);
    
    // Dossier médical complet du patient
    Route::prefix('patients/{patient}')->group(function () {
        Route::get('/medical-folder', [MedicalFolderController::class, 'show']);
        Route::get('/medical-folder/appointments', [MedicalFolderController::class, 'appointments']);
        Route::get('/medical-folder/medical-records', [MedicalFolderController::class, 'medicalRecords']);
        Route::get('/medical-folder/treatments', [MedicalFolderController::class, 'treatments']);
        Route::get('/medical-folder/radiographies', [MedicalFolderController::class, 'radiographies']);
    });
});
