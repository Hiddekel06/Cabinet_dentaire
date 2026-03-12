<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatisticsController extends Controller
{
    /**
     * Retourne un tableau de bord unifie pour la page statistiques.
     */
    public function overview(Request $request)
    {
        [$periodKey, $periodLabel, $startDate, $endDate] = $this->resolvePeriodRange($request->input('period'));

        $revenueCollected = (float) Invoice::query()
            ->whereBetween('issue_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->sum('paid_amount');

        $expensesTotal = (float) Product::query()
            ->whereBetween('purchase_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->sum('total_amount');

        $netResult = $revenueCollected - $expensesTotal;

        $invoicesPaid = Invoice::query()
            ->whereBetween('issue_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->where('status', 'paid')
            ->count();

        $invoicesPending = Invoice::query()
            ->whereBetween('issue_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->where('status', 'pending')
            ->count();

        $newPatients = Patient::query()
            ->whereBetween('created_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
            ->count();

        $appointmentsTotal = Appointment::query()
            ->whereBetween('appointment_date', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
            ->count();

        $appointmentsCancelled = Appointment::query()
            ->whereBetween('appointment_date', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
            ->where('status', 'cancelled')
            ->count();

        $financeByMonth = $this->buildFinanceByMonthSeries();
        $appointmentsByDay = $this->buildAppointmentsByDaySeries();
        $topActs = $this->buildTopActsSeries($startDate, $endDate);

        return response()->json([
            'period' => [
                'key' => $periodKey,
                'label' => $periodLabel,
                'from' => $startDate->toDateString(),
                'to' => $endDate->toDateString(),
            ],
            'kpis' => [
                'revenue_collected' => $revenueCollected,
                'expenses_total' => $expensesTotal,
                'net_result' => $netResult,
                'invoices_paid' => $invoicesPaid,
                'invoices_pending' => $invoicesPending,
                'new_patients' => $newPatients,
                'appointments_total' => $appointmentsTotal,
                'appointments_cancelled' => $appointmentsCancelled,
            ],
            'invoice_status' => [
                ['label' => 'Payees', 'value' => $invoicesPaid],
                ['label' => 'Non traitees', 'value' => $invoicesPending],
            ],
            'top_acts' => $topActs,
            'appointments_by_day' => $appointmentsByDay,
            'finance_by_month' => $financeByMonth,
        ]);
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

        return [$key, $label, $start, $end];
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
