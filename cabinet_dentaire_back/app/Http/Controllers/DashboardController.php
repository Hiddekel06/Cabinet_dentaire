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

        $data = Cache::remember($cacheKey, 120, function () use (
            $periodKey, $periodLabel, $startDate, $endDate, $prevStartDate, $prevEndDate, $today
        ) {
            $patientsTotal = Patient::query()->count();

            $newPatientsCurrent = Patient::query()
                ->whereBetween('created_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
                ->count();

            $newPatientsPrevious = Patient::query()
                ->whereBetween('created_at', [$prevStartDate->copy()->startOfDay(), $prevEndDate->copy()->endOfDay()])
                ->count();

            $appointmentsTodayQuery = Appointment::query()->whereDate('appointment_date', $today);
            $appointmentsToday = (clone $appointmentsTodayQuery)->count();
            $appointmentsPendingToday = (clone $appointmentsTodayQuery)
                ->whereIn('status', ['pending', 'confirmed'])
                ->count();

            $appointmentsCancelledToday = (clone $appointmentsTodayQuery)
                ->where('status', 'cancelled')
                ->count();

            $appointmentsCompletedToday = (clone $appointmentsTodayQuery)
                ->where('status', 'completed')
                ->count();

            $appointmentsYesterday = Appointment::query()
                ->whereDate('appointment_date', Carbon::yesterday())
                ->count();

            $invoicesPending = Invoice::query()
                ->whereBetween('issue_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->where('status', 'pending')
                ->count();

            $invoicesPaid = Invoice::query()
                ->whereBetween('issue_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->where('status', 'paid')
                ->count();

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
                ->whereDate('appointment_date', $today)
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

            $remainingAppointments = Appointment::query()
                ->whereDate('appointment_date', $today)
                ->where('appointment_date', '>', Carbon::now())
                ->whereIn('status', ['pending', 'confirmed'])
                ->count();

            $averageDuration = (float) Appointment::query()
                ->whereDate('appointment_date', $today)
                ->whereNotNull('duration')
                ->avg('duration');

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
                    'cache_ttl_seconds' => 120,
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
                        'new_patients_today' => Patient::query()->whereDate('created_at', $today)->count(),
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
        $appointments = Appointment::query()
            ->whereDate('appointment_date', $day)
            ->get(['appointment_date']);

        $slots = [
            ['slot' => '08:00-10:00', 'start' => 8, 'end' => 10],
            ['slot' => '10:00-12:00', 'start' => 10, 'end' => 12],
            ['slot' => '14:00-16:00', 'start' => 14, 'end' => 16],
        ];

        return collect($slots)->map(function ($slot) use ($appointments) {
            $count = $appointments->filter(function ($appointment) use ($slot) {
                $hour = (int) Carbon::parse($appointment->appointment_date)->format('H');
                return $hour >= $slot['start'] && $hour < $slot['end'];
            })->count();

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
