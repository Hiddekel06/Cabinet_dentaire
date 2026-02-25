
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AppointmentController;

// Route PWA calendrier mobile
Route::get('/pwa/calendar', [AppointmentController::class, 'pwaCalendar']);

Route::get('/', function () {
    return ['Laravel' => app()->version()];
});

require __DIR__.'/auth.php';
