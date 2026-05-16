<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\PatientTreatment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function overview(Request $request)
    {
        $period = $request->input('period', 'month');
        $cacheKey = "dashboard:overview:{$period}";

        return Cache::remember($cacheKey, 300, function () use ($period) {
            $todayStart = Carbon::now()->startOfDay();
            $todayEnd = Carbon::now()->endOfDay();

            // Statistiques des rendez-vous (Appointments Summary)
            $appointmentsCount = Appointment::whereBetween('appointment_date', [$todayStart, $todayEnd])->count();
            $completedAppointments = Appointment::whereBetween('appointment_date', [$todayStart, $todayEnd])
                ->where('status', 'completed')
                ->count();
            $pendingAppointments = Appointment::whereBetween('appointment_date', [$todayStart, $todayEnd])
                ->where('status', 'pending')
                ->count();

            // Calcul des encaissements (Finance Summary) - Basé sur les reçus de séance (inclut les manuels)
            $todayCollected = (float) DB::table('session_receipts')
                ->whereBetween('issue_date', [$todayStart->toDateString(), $todayEnd->toDateString()])
                ->where('status', 'paid')
                ->sum('total_amount');

            $weekCollected = (float) DB::table('session_receipts')
                ->whereBetween('issue_date', [Carbon::now()->startOfWeek()->toDateString(), $todayEnd->toDateString()])
                ->where('status', 'paid')
                ->sum('total_amount');

            $monthCollected = (float) DB::table('session_receipts')
                ->whereBetween('issue_date', [Carbon::now()->startOfMonth()->toDateString(), $todayEnd->toDateString()])
                ->where('status', 'paid')
                ->sum('total_amount');

            $todayDetails = DB::table('session_receipts')
                ->join('patients', 'patients.id', '=', 'session_receipts.patient_id')
                ->whereBetween('session_receipts.issue_date', [$todayStart->toDateString(), $todayEnd->toDateString()])
                ->where('session_receipts.status', 'paid')
                ->where('total_amount', '>', 0)
                ->select('patients.first_name', 'patients.last_name', 'session_receipts.total_amount', 'session_receipts.created_at')
                ->get()
                ->map(function($receipt) {
                    return [
                        'patient_name' => trim($receipt->first_name . ' ' . $receipt->last_name),
                        'amount' => (float) $receipt->total_amount,
                        'time' => Carbon::parse($receipt->created_at)->format('H:i'),
                    ];
                });

            // Statistiques des patients (Patients Overview)
            $newPatientsThisMonth = Patient::where('created_at', '>=', Carbon::now()->startOfMonth())->count();
            $totalPatients = Patient::count();

            // Facturation (Billing Overview)
            $totalInvoices = Invoice::count();
            $pendingInvoicesCount = Invoice::where('status', 'pending')->count();
            $overdueInvoicesCount = Invoice::where('status', 'pending')
                ->where('due_date', '<', Carbon::now())
                ->count();

            $billingRatio = 0;
            if ($totalInvoices > 0) {
                $billingRatio = round(($pendingInvoicesCount / $totalInvoices) * 100);
            }

            return [
                'cards' => [
                    'patients_total' => [
                        'value' => $totalPatients,
                        'trend_percent' => 0
                    ],
                    'appointments_today' => [
                        'value' => $appointmentsCount,
                        'pending_count' => $pendingAppointments
                    ],
                    'new_patients_period' => [
                        'value' => $newPatientsThisMonth,
                        'trend_percent' => 0
                    ],
                    'invoices_pending' => [
                        'value' => $pendingInvoicesCount,
                        'ratio_percent' => $billingRatio
                    ],
                ],
                'finance_summary' => [
                    'today_collected' => $todayCollected,
                    'week_collected' => $weekCollected,
                    'month_collected' => $monthCollected,
                    'today_details' => $todayDetails,
                    'currency' => 'XOF',
                ],
                'recent_patients' => Patient::latest()->limit(5)->get()->map(function($p) {
                    // Calcul de la vraie dernière visite (passée et terminée)
                    $lastVisit = $p->appointments()
                        ->where('appointment_date', '<=', now())
                        ->where('status', 'completed')
                        ->latest('appointment_date')
                        ->first();

                    return [
                        'id' => $p->id,
                        'first_name' => $p->first_name,
                        'last_name' => $p->last_name,
                        'display_id' => 'PAT-' . str_pad($p->id, 5, '0', STR_PAD_LEFT),
                        'phone' => $p->phone,
                        'email' => $p->email,
                        'last_appointment_date' => $lastVisit?->appointment_date,
                        'status_label' => $p->status_label // Utiliser l'attribut du modèle s'il existe
                    ];
                }),
                'today_appointments' => Appointment::whereBetween('appointment_date', [$todayStart, $todayEnd])
                    ->with('patient')
                    ->orderBy('appointment_date')
                    ->limit(5)
                    ->get()
                    ->map(function($a) {
                        return [
                            'id' => $a->id,
                            'time' => Carbon::parse($a->appointment_date)->format('H:i'),
                            'patient_name' => $a->patient ? $a->patient->first_name . ' ' . $a->patient->last_name : 'Inconnu',
                            'reason' => $a->reason
                        ];
                    }),
                'daily_summary' => [
                    'quick_indicators' => [
                        'new_patients_today' => Patient::whereDate('created_at', Carbon::today())->count(),
                        'attendance_rate_percent' => $appointmentsCount > 0 ? round(($completedAppointments / $appointmentsCount) * 100) : 0,
                        'appointments_completed_today' => $completedAppointments,
                    ]
                ]
            ];
        });
    }

    /**
     * Retourne la liste des patients nécessitant un rendez-vous (Traitements sans prochain RDV).
     * Destiné principalement au secrétariat.
     */
    public function pendingActions(Request $request)
    {
        $pending = PatientTreatment::query()
            ->with(['patient:id,first_name,last_name,phone'])
            ->whereIn('status', ['planned', 'in_progress'])
            ->whereNull('next_appointment_id')
            ->latest('updated_at')
            ->get()
            ->map(function ($treatment) {
                // Trouver le dernier dossier médical pour savoir quand il a été vu
                $lastVisit = $treatment->medicalRecords()->latest()->first();
                
                return [
                    'treatment_id' => $treatment->id,
                    'treatment_name' => $treatment->name,
                    'patient_id' => $treatment->patient_id,
                    'patient_name' => $treatment->patient ? "{$treatment->patient->first_name} {$treatment->patient->last_name}" : 'Inconnu',
                    'patient_phone' => $treatment->patient?->phone,
                    'last_visit_date' => $lastVisit ? Carbon::parse($lastVisit->created_at)->diffForHumans() : 'Jamais vu',
                    'status' => $treatment->status
                ];
            });

        return response()->json($pending);
    }

    public function activity()
    {
        $rows = DB::table('patient_treatments')
            ->select('name', DB::raw('count(*) as count'), DB::raw('sum(0) as revenue')) // revenue logic is complex, placeholder
            ->groupBy('name')
            ->orderBy('count', 'desc')
            ->limit(5)
            ->get();

        return $rows->map(function ($row) {
            return [
                'name' => (string) $row->name,
                'count' => (int) $row->count,
                'revenue' => (float) $row->revenue,
            ];
        })->values()->all();
    }

    public function appointmentsStatus()
    {
        $rows = DB::table('appointments')
            ->select('status as label', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get();

        return $rows->map(function ($row) {
            return [
                'label' => (string) $row->label,
                'count' => (int) $row->count,
            ];
        })->values()->all();
    }
}
