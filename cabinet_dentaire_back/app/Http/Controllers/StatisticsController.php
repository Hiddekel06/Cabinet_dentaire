<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\Product;
use App\Models\SessionReceipt;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class StatisticsController extends Controller
{
    /**
     * Retourne un tableau de bord unifie pour la page statistiques.
     */
    public function overview(Request $request)
    {
        [$periodKey, $periodLabel, $startDate, $endDate, $prevStartDate, $prevEndDate] = $this->resolvePeriodRange(
            $request->input('period')
        );

        $cacheKey = sprintf(
            'statistics:overview:%s:%s:%s',
            $periodKey,
            $startDate->toDateString(),
            $endDate->toDateString()
        );

        $payload = Cache::remember($cacheKey, now()->addMinutes(2), function () use (
            $periodKey,
            $periodLabel,
            $startDate,
            $endDate,
            $prevStartDate,
            $prevEndDate
        ) {
            $revenueCollected = $this->sumRevenue($startDate, $endDate);
            $expensesTotal = $this->sumExpenses($startDate, $endDate);
            $netResult = $revenueCollected - $expensesTotal;

            $prevRevenue = $this->sumRevenue($prevStartDate, $prevEndDate);
            $prevExpenses = $this->sumExpenses($prevStartDate, $prevEndDate);
            $prevNet = $prevRevenue - $prevExpenses;

            $receivableAmount = (float) Invoice::query()
                ->whereBetween('issue_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->where('status', '!=', 'cancelled')
                ->sum(DB::raw('GREATEST(total_amount - paid_amount, 0)'));

            $sessionReceiptsPaid = (float) SessionReceipt::query()
                ->whereBetween('issue_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->where('status', 'paid')
                ->sum('total_amount');

            $sessionReceiptsPending = (float) SessionReceipt::query()
                ->whereBetween('issue_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->where('status', 'pending')
                ->sum('total_amount');

            $prevSessionReceiptsPaid = (float) SessionReceipt::query()
                ->whereBetween('issue_date', [$prevStartDate->toDateString(), $prevEndDate->toDateString()])
                ->where('status', 'paid')
                ->sum('total_amount');

            $prevSessionReceiptsPending = (float) SessionReceipt::query()
                ->whereBetween('issue_date', [$prevStartDate->toDateString(), $prevEndDate->toDateString()])
                ->where('status', 'pending')
                ->sum('total_amount');

            $revenueCollected += $sessionReceiptsPaid;
            $receivableAmount += $sessionReceiptsPending;

            $invoicesPaid = Invoice::query()
                ->whereBetween('issue_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->where('status', 'paid')
                ->count();

            $invoicesPending = Invoice::query()
                ->whereBetween('issue_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->where('status', 'pending')
                ->count();

            $prevInvoicesPaid = Invoice::query()
                ->whereBetween('issue_date', [$prevStartDate->toDateString(), $prevEndDate->toDateString()])
                ->where('status', 'paid')
                ->count();

            $prevInvoicesPending = Invoice::query()
                ->whereBetween('issue_date', [$prevStartDate->toDateString(), $prevEndDate->toDateString()])
                ->where('status', 'pending')
                ->count();

            $sessionReceiptsPaidCount = SessionReceipt::query()
                ->whereBetween('issue_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->where('status', 'paid')
                ->count();

            $sessionReceiptsPendingCount = SessionReceipt::query()
                ->whereBetween('issue_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->where('status', 'pending')
                ->count();

            $prevSessionReceiptsPaidCount = SessionReceipt::query()
                ->whereBetween('issue_date', [$prevStartDate->toDateString(), $prevEndDate->toDateString()])
                ->where('status', 'paid')
                ->count();

            $prevSessionReceiptsPendingCount = SessionReceipt::query()
                ->whereBetween('issue_date', [$prevStartDate->toDateString(), $prevEndDate->toDateString()])
                ->where('status', 'pending')
                ->count();

            $newPatients = Patient::query()
                ->whereBetween('created_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
                ->count();

            $prevNewPatients = Patient::query()
                ->whereBetween('created_at', [$prevStartDate->copy()->startOfDay(), $prevEndDate->copy()->endOfDay()])
                ->count();

            $appointmentsTotal = Appointment::query()
                ->whereBetween('appointment_date', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
                ->count();

            $appointmentsCancelled = Appointment::query()
                ->whereBetween('appointment_date', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
                ->where('status', 'cancelled')
                ->count();

            $prevAppointmentsTotal = Appointment::query()
                ->whereBetween('appointment_date', [$prevStartDate->copy()->startOfDay(), $prevEndDate->copy()->endOfDay()])
                ->count();

            $prevAppointmentsCancelled = Appointment::query()
                ->whereBetween('appointment_date', [$prevStartDate->copy()->startOfDay(), $prevEndDate->copy()->endOfDay()])
                ->where('status', 'cancelled')
                ->count();

            return [
                'period' => [
                    'key' => $periodKey,
                    'label' => $periodLabel,
                    'from' => $startDate->toDateString(),
                    'to' => $endDate->toDateString(),
                ],
                'meta' => [
                    'generated_at' => now()->toIso8601String(),
                    'cache_ttl_seconds' => 120,
                    'series_window' => [
                        'finance_by_month' => '6_months',
                        'appointments_by_day' => '7_days',
                    ],
                ],
                'kpis' => [
                    'revenue_collected' => $revenueCollected,
                    'expenses_total' => $expensesTotal,
                    'net_result' => $netResult,
                    'receivable_amount' => $receivableAmount,
                    'invoices_paid' => $invoicesPaid,
                    'invoices_pending' => $invoicesPending,
                    'session_receipts_paid' => $sessionReceiptsPaidCount,
                    'session_receipts_pending' => $sessionReceiptsPendingCount,
                    'new_patients' => $newPatients,
                    'appointments_total' => $appointmentsTotal,
                    'appointments_cancelled' => $appointmentsCancelled,
                ],
                'trends' => [
                    'revenue_collected_percent' => $this->calculatePercentChange($revenueCollected, $prevRevenue),
                    'expenses_total_percent' => $this->calculatePercentChange($expensesTotal, $prevExpenses),
                    'net_result_percent' => $this->calculatePercentChange($netResult, $prevNet),
                    'invoices_paid_percent' => $this->calculatePercentChange($invoicesPaid, $prevInvoicesPaid),
                    'invoices_pending_percent' => $this->calculatePercentChange($invoicesPending, $prevInvoicesPending),
                    'session_receipts_paid_percent' => $this->calculatePercentChange($sessionReceiptsPaidCount, $prevSessionReceiptsPaidCount),
                    'session_receipts_pending_percent' => $this->calculatePercentChange($sessionReceiptsPendingCount, $prevSessionReceiptsPendingCount),
                    'new_patients_percent' => $this->calculatePercentChange($newPatients, $prevNewPatients),
                    'appointments_total_percent' => $this->calculatePercentChange($appointmentsTotal, $prevAppointmentsTotal),
                    'appointments_cancelled_percent' => $this->calculatePercentChange($appointmentsCancelled, $prevAppointmentsCancelled),
                ],
                'invoice_status' => [
                    ['key' => 'paid', 'label' => 'Payees', 'value' => $invoicesPaid, 'color' => 'emerald'],
                    ['key' => 'pending', 'label' => 'Non traitees', 'value' => $invoicesPending, 'color' => 'amber'],
                ],
                'receipt_status' => [
                    ['key' => 'paid', 'label' => 'Reçus payés', 'value' => $sessionReceiptsPaidCount, 'color' => 'emerald'],
                    ['key' => 'pending', 'label' => 'Reçus non payés', 'value' => $sessionReceiptsPendingCount, 'color' => 'amber'],
                ],
                'top_acts' => $this->buildTopActsSeries($startDate, $endDate),
                'appointments_by_day' => $this->buildAppointmentsByDaySeries(),
                'finance_by_month' => $this->buildFinanceByMonthSeries(),
            ];
        });

        return response()->json($payload);
    }

    private function resolvePeriodRange(?string $rawPeriod): array
    {
        $period = strtolower(trim((string) $rawPeriod));

        $now = Carbon::now();
        $start = $now->copy()->startOfMonth();
        $label = 'Ce mois';
        $key = 'month';

        if (in_array($period, ['quarter', 'trimestre', 'ce trimestre', 'this_quarter'], true)) {
            $start = $now->copy()->startOfQuarter();
            $label = 'Ce trimestre';
            $key = 'quarter';
        } elseif (in_array($period, ['year', 'annee', 'année', 'cette annee', 'cette année', 'this_year'], true)) {
            $start = $now->copy()->startOfYear();
            $label = 'Cette annee';
            $key = 'year';
        }

        $end = $now->copy()->endOfDay();

        $durationDays = max($start->diffInDays($end), 1);
        $prevEnd = $start->copy()->subDay()->endOfDay();
        $prevStart = $prevEnd->copy()->subDays($durationDays)->startOfDay();

        return [$key, $label, $start, $end, $prevStart, $prevEnd];
    }

    private function sumRevenue(Carbon $from, Carbon $to): float
    {
        $invoiceRevenue = (float) Invoice::query()
            ->whereBetween('issue_date', [$from->toDateString(), $to->toDateString()])
            ->sum('paid_amount');

        $receiptRevenue = (float) SessionReceipt::query()
            ->whereBetween('issue_date', [$from->toDateString(), $to->toDateString()])
            ->where('status', 'paid')
            ->sum('total_amount');

        return $invoiceRevenue + $receiptRevenue;
    }

    private function sumExpenses(Carbon $from, Carbon $to): float
    {
        return (float) Product::query()
            ->whereBetween('purchase_date', [$from->toDateString(), $to->toDateString()])
            ->sum('total_amount');
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

    private function buildFinanceByMonthSeries(): array
    {
        $startMonth = Carbon::now()->subMonths(5)->startOfMonth();
        $endMonth = Carbon::now()->endOfMonth();

        $invoiceRows = Invoice::query()
            ->selectRaw("DATE_FORMAT(issue_date, '%Y-%m') as ym, COALESCE(SUM(paid_amount), 0) as total")
            ->whereBetween('issue_date', [$startMonth->toDateString(), $endMonth->toDateString()])
            ->groupBy('ym')
            ->pluck('total', 'ym');

        $productRows = Product::query()
            ->selectRaw("DATE_FORMAT(purchase_date, '%Y-%m') as ym, COALESCE(SUM(total_amount), 0) as total")
            ->whereBetween('purchase_date', [$startMonth->toDateString(), $endMonth->toDateString()])
            ->groupBy('ym')
            ->pluck('total', 'ym');

        $series = [];
        $cursor = $startMonth->copy();

        while ($cursor->lte($endMonth)) {
            $ym = $cursor->format('Y-m');
            $series[] = [
                'month' => ucfirst($cursor->locale('fr')->isoFormat('MMM')),
                'revenue' => (float) ($invoiceRows[$ym] ?? 0),
                'expenses' => (float) ($productRows[$ym] ?? 0),
            ];
            $cursor->addMonth();
        }

        return $series;
    }

    private function buildAppointmentsByDaySeries(): array
    {
        $start = Carbon::now()->subDays(6)->startOfDay();
        $end = Carbon::now()->endOfDay();

        $rows = Appointment::query()
            ->selectRaw("DATE(appointment_date) as d, COUNT(*) as total")
            ->whereBetween('appointment_date', [$start, $end])
            ->groupBy('d')
            ->pluck('total', 'd');

        $series = [];
        $cursor = $start->copy();

        while ($cursor->lte($end)) {
            $d = $cursor->toDateString();
            $series[] = [
                'day' => ucfirst($cursor->locale('fr')->isoFormat('ddd')),
                'value' => (int) ($rows[$d] ?? 0),
            ];
            $cursor->addDay();
        }

        return $series;
    }

    private function buildTopActsSeries(Carbon $startDate, Carbon $endDate): array
    {
        $rows = DB::table('invoice_items as ii')
            ->join('invoices as i', 'i.id', '=', 'ii.invoice_id')
            ->join('patient_treatment_acts as pta', 'pta.id', '=', 'ii.patient_treatment_act_id')
            ->join('dental_acts as da', 'da.id', '=', 'pta.dental_act_id')
            ->whereBetween('i.issue_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->where('i.status', '!=', 'cancelled')
            ->selectRaw('da.name as name, COUNT(ii.id) as count, COALESCE(SUM(ii.subtotal), 0) as revenue')
            ->groupBy('da.name')
            ->orderByDesc('count')
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
}
