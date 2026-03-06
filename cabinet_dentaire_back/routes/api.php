<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TreatmentController;
use App\Http\Controllers\MedicalRecordController;
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
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Gestion des actes dentaires (admin)
    Route::post('/dental-acts/import', [App\Http\Controllers\DentalActController::class, 'import']);
    Route::delete('/dental-acts/truncate', [App\Http\Controllers\DentalActController::class, 'truncate']);
    
    // Gestion des patients
    Route::apiResource('patients', PatientController::class);
    
    // Gestion des rendez-vous
    Route::apiResource('appointments', AppointmentController::class);
    
    // Gestion des traitements (catalogue)
    Route::apiResource('treatments', TreatmentController::class);
    
    // Gestion des dossiers médicaux
    Route::apiResource('medical-records', MedicalRecordController::class);
    
    // Gestion des traitements patients (suivi)
    Route::apiResource('patient-treatments', PatientTreatmentController::class);
    
    // Gestion des radiographies
    Route::apiResource('radiographies', RadiographyController::class);

    // Gestion des achats (produits)
    Route::get('products/statistics', [ProductController::class, 'statistics']);
    Route::apiResource('products', ProductController::class);

    // Gestion des types de produits
    Route::apiResource('product-types', ProductTypeController::class);

    // Gestion des certificats médicaux
    Route::apiResource('medical-certificates', \App\Http\Controllers\MedicalCertificateController::class);
    
    // Dossier médical complet du patient
    Route::prefix('patients/{patient}')->group(function () {
        Route::get('/medical-folder', [MedicalFolderController::class, 'show']);
        Route::get('/medical-folder/appointments', [MedicalFolderController::class, 'appointments']);
        Route::get('/medical-folder/medical-records', [MedicalFolderController::class, 'medicalRecords']);
        Route::get('/medical-folder/treatments', [MedicalFolderController::class, 'treatments']);
        Route::get('/medical-folder/radiographies', [MedicalFolderController::class, 'radiographies']);
    });
});
