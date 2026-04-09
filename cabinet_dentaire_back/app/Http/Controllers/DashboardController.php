<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function overview(Request $request)
    {
        [$periodKey, $periodLabel, $startDate, $endDate, $prevStartDate, $prevEndDate] = $this->resolvePeriodRange(
            $request->input('period')
        );

        $today = Carbon::today();
        $cacheKey = "dashboard:overview:{$periodKey}:{$today->toDateString()}";

        $data = Cache::remember($cacheKey, 300, function () use (
            $periodKey, $periodLabel, $startDate, $endDate, $prevStartDate, $prevEndDate, $today
        ) {
            $now = Carbon::now();
            $todayStart = $today->copy()->startOfDay();
            $todayEnd = $today->copy()->endOfDay();
            $yesterdayStart = Carbon::yesterday()->startOfDay();
            $yesterdayEnd = Carbon::yesterday()->endOfDay();

            $periodStart = $startDate->copy()->startOfDay();
            $periodEnd = $endDate->copy()->endOfDay();
            $prevPeriodStart = $prevStartDate->copy()->startOfDay();
            $prevPeriodEnd = $prevEndDate->copy()->endOfDay();

            $patientStats = Patient::query()
                ->selectRaw('COUNT(*) as total_count')
                ->selectRaw('SUM(CASE WHEN created_at BETWEEN ? AND ? THEN 1 ELSE 0 END) as current_count', [$periodStart, $periodEnd])
                ->selectRaw('SUM(CASE WHEN created_at BETWEEN ? AND ? THEN 1 ELSE 0 END) as previous_count', [$prevPeriodStart, $prevPeriodEnd])
                ->selectRaw('SUM(CASE WHEN created_at BETWEEN ? AND ? THEN 1 ELSE 0 END) as today_count', [$todayStart, $todayEnd])
                ->first();

            $patientsTotal = (int) ($patientStats?->total_count ?? 0);
            $newPatientsCurrent = (int) ($patientStats?->current_count ?? 0);
            $newPatientsPrevious = (int) ($patientStats?->previous_count ?? 0);
            $newPatientsToday = (int) ($patientStats?->today_count ?? 0);

            $appointmentsTodayStats = Appointment::query()
                ->whereBetween('appointment_date', [$todayStart, $todayEnd])
                ->selectRaw('COUNT(*) as total_count')
                ->selectRaw("SUM(CASE WHEN status IN ('pending', 'confirmed') THEN 1 ELSE 0 END) as pending_count")
                ->selectRaw("SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count")
                ->selectRaw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count")
                ->selectRaw("SUM(CASE WHEN appointment_date > ? AND status IN ('pending', 'confirmed') THEN 1 ELSE 0 END) as remaining_count", [$now])
                ->selectRaw('AVG(duration) as avg_duration')
                ->first();

            $appointmentsToday = (int) ($appointmentsTodayStats?->total_count ?? 0);
            $appointmentsPendingToday = (int) ($appointmentsTodayStats?->pending_count ?? 0);
            $appointmentsCancelledToday = (int) ($appointmentsTodayStats?->cancelled_count ?? 0);
            $appointmentsCompletedToday = (int) ($appointmentsTodayStats?->completed_count ?? 0);
            $remainingAppointments = (int) ($appointmentsTodayStats?->remaining_count ?? 0);
            $averageDuration = (float) ($appointmentsTodayStats?->avg_duration ?? 0);

            $appointmentsYesterday = Appointment::query()
                ->whereBetween('appointment_date', [$yesterdayStart, $yesterdayEnd])
                ->count();

            $invoiceStats = Invoice::query()
                ->whereBetween('issue_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->selectRaw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count")
                ->selectRaw("SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count")
                ->first();

            $invoicesPending = (int) ($invoiceStats?->pending_count ?? 0);
            $invoicesPaid = (int) ($invoiceStats?->paid_count ?? 0);

            $invoicesTotalPeriod = max($invoicesPending + $invoicesPaid, 1);
            $pendingRatioPercent = (int) round(($invoicesPending / $invoicesTotalPeriod) * 100);

            $recentPatients = Patient::query()
                ->with([
                    'appointments' => function ($query) {
                        $query->latest('appointment_date')->limit(1);
                    },
                    'medicalRecords' => function ($query) {
                        $query->latest()->limit(1);
                    },
                ])
                ->latest()
                ->limit(3)
                ->get()
                ->map(function (Patient $patient) {
                    $lastAppointment = $patient->appointments->first();
                    $lastRecord = $patient->medicalRecords->first();

                    $statusLabel = match ($lastAppointment?->status) {
                        'pending', 'confirmed' => 'En traitement',
                        'completed' => 'Suivi',
                        'cancelled' => 'Nouveau',
                        default => 'Nouveau',
                    };

                    return [
                        'id' => (int) $patient->id,
                        'display_id' => 'N°' . $patient->id,
                        'first_name' => (string) ($patient->first_name ?? ''),
                        'last_name' => (string) ($patient->last_name ?? ''),
                        'phone' => (string) ($patient->phone ?? ''),
                        'email' => (string) ($patient->email ?? ''),
                        'last_appointment_date' => $lastAppointment?->appointment_date?->toDateString(),
                        'last_treatment' => (string) ($lastRecord?->treatment_performed ?? '-'),
                        'status_label' => $statusLabel,
                    ];
                })
                ->values();

            $todayAppointments = Appointment::query()
                ->with('patient:id,first_name,last_name')
                ->whereBetween('appointment_date', [$todayStart, $todayEnd])
                ->orderBy('appointment_date')
                ->limit(8)
                ->get()
                ->map(function (Appointment $appointment) {
                    $patientName = trim(
                        (string) ($appointment->patient?->first_name ?? '') . ' ' . (string) ($appointment->patient?->last_name ?? '')
                    );

                    return [
                        'id' => (int) $appointment->id,
                        'time' => $appointment->appointment_date?->format('H:i') ?? '--:--',
                        'patient_name' => $patientName !== '' ? $patientName : 'Patient',
                        'reason' => (string) ($appointment->reason ?? 'Consultation'),
                        'status' => (string) ($appointment->status ?? 'pending'),
                    ];
                })
                ->values();

            $patientsBySlot = $this->buildPatientsBySlotSeries($today);
            $actsBreakdown = $this->buildActsBreakdownSeries($startDate, $endDate);

            $attendanceRate = $appointmentsToday > 0
                ? (int) round((($appointmentsToday - $appointmentsCancelledToday) / $appointmentsToday) * 100)
                : 0;

            return [
                'period' => [
                    'key' => $periodKey,
                    'label' => $periodLabel,
                    'from' => $startDate->toDateString(),
                    'to' => $endDate->toDateString(),
                ],
                'meta' => [
                    'generated_at' => Carbon::now()->toIso8601String(),
                    'cache_ttl_seconds' => 300,
                ],
                'cards' => [
                    'patients_total' => [
                        'value' => $patientsTotal,
                        'trend_percent' => $this->calculatePercentChange($newPatientsCurrent, $newPatientsPrevious),
                    ],
                    'appointments_today' => [
                        'value' => $appointmentsToday,
                        'pending_count' => $appointmentsPendingToday,
                    ],
                    'new_patients_period' => [
                        'value' => $newPatientsCurrent,
                        'trend_percent' => $this->calculatePercentChange($newPatientsCurrent, $newPatientsPrevious),
                    ],
                    'invoices_pending' => [
                        'value' => $invoicesPending,
                        'ratio_percent' => $pendingRatioPercent,
                    ],
                ],
                'recent_patients' => $recentPatients,
                'today_appointments' => $todayAppointments,
                'daily_summary' => [
                    'patients_by_slot' => $patientsBySlot,
                    'acts_breakdown' => $actsBreakdown,
                    'remaining_appointments' => [
                        'value' => $remainingAppointments,
                        'total_today' => $appointmentsToday,
                    ],
                    'quick_indicators' => [
                        'new_patients_today' => $newPatientsToday,
                        'attendance_rate_percent' => $attendanceRate,
                        'average_duration_minutes' => (int) round($averageDuration),
                        'vs_yesterday_percent' => $this->calculatePercentChange($appointmentsToday, $appointmentsYesterday),
                        'appointments_completed_today' => $appointmentsCompletedToday,
                    ],
                ],
            ];
        });

        return response()->json($data);
    }

    private function resolvePeriodRange(?string $rawPeriod): array
    {
        $period = strtolower(trim((string) $rawPeriod));

        $now = Carbon::now();
        $start = $now->copy()->startOfMonth();
        $end = $now->copy()->endOfDay();
        $label = 'Ce mois';
        $key = 'month';

        if (in_array($period, ['quarter', 'trimestre', 'ce trimestre', 'this_quarter'], true)) {
            $start = $now->copy()->startOfQuarter();
            $label = 'Ce trimestre';
            $key = 'quarter';
        } elseif (in_array($period, ['year', 'annee', 'année', 'cette annee', 'cette année', 'this_year'], true)) {
            $start = $now->copy()->startOfYear();
            $label = 'Cette année';
            $key = 'year';
        }

        $durationDays = max($start->diffInDays($end), 1);
        $prevEnd = $start->copy()->subDay()->endOfDay();
        $prevStart = $prevEnd->copy()->subDays($durationDays)->startOfDay();

        return [$key, $label, $start, $end, $prevStart, $prevEnd];
    }

    private function calculatePercentChange(float|int $current, float|int $previous): int
    {
        $curr = (float) $current;
        $prev = (float) $previous;

        if ($prev <= 0.0) {
            return $curr > 0.0 ? 100 : 0;
        }

        return (int) round((($curr - $prev) / $prev) * 100);
    }

    private function buildPatientsBySlotSeries(Carbon $day): array
    {
        $dayStart = $day->copy()->startOfDay();
        $dayEnd = $day->copy()->endOfDay();

        $hourlyCounts = Appointment::query()
            ->whereBetween('appointment_date', [$dayStart, $dayEnd])
            ->selectRaw('HOUR(appointment_date) as hour_slot, COUNT(*) as total')
            ->groupBy('hour_slot')
            ->pluck('total', 'hour_slot');

        $slots = [
            ['slot' => '08:00-10:00', 'start' => 8, 'end' => 10],
            ['slot' => '10:00-12:00', 'start' => 10, 'end' => 12],
            ['slot' => '14:00-16:00', 'start' => 14, 'end' => 16],
        ];

        return collect($slots)->map(function ($slot) use ($hourlyCounts) {
            $count = 0;

            for ($hour = $slot['start']; $hour < $slot['end']; $hour++) {
                $count += (int) ($hourlyCounts[$hour] ?? 0);
            }

            return [
                'slot' => $slot['slot'],
                'count' => $count,
            ];
        })->values()->all();
    }

    private function buildActsBreakdownSeries(Carbon $startDate, Carbon $endDate): array
    {
        $rows = DB::table('invoice_items as ii')
            ->join('invoices as i', 'i.id', '=', 'ii.invoice_id')
            ->join('patient_treatment_acts as pta', 'pta.id', '=', 'ii.patient_treatment_act_id')
            ->join('dental_acts as da', 'da.id', '=', 'pta.dental_act_id')
            ->whereBetween('i.issue_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->where('i.status', '!=', 'cancelled')
            ->selectRaw("COALESCE(NULLIF(da.category, ''), 'Autres') as label, COUNT(ii.id) as count")
            ->groupBy('label')
            ->orderByDesc('count')
            ->limit(4)
            ->get();

        return $rows->map(function ($row) {
            return [
                'label' => (string) $row->label,
                'count' => (int) $row->count,
            ];
        })->values()->all();
    }
}
