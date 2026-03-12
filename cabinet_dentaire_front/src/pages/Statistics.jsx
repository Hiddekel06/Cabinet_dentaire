import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { statisticsAPI } from "../services/api";
import {
  BanknotesIcon,
  ShoppingCartIcon,
  ScaleIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  UserPlusIcon,
  CalendarIcon,
  XCircleIcon,
  ChevronDownIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

const timePeriods = [
  { label: "Ce mois", value: "month" },
  { label: "Ce trimestre", value: "quarter" },
  { label: "Cette année", value: "year" },
];

const badgeClasses = {
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  indigo: "bg-indigo-100 text-indigo-700",
  slate: "bg-slate-100 text-slate-700",
};

const formatMoney = (amount) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};

const defaultStats = {
  kpis: {
    revenue_collected: 0,
    expenses_total: 0,
    net_result: 0,
    invoices_paid: 0,
    invoices_pending: 0,
    new_patients: 0,
    appointments_total: 0,
    appointments_cancelled: 0,
  },
  invoice_status: [
    { label: "Payees", value: 0 },
    { label: "Non traitees", value: 0 },
  ],
  top_acts: [],
  appointments_by_day: [],
  finance_by_month: [],
};

const Statistics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOverview = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await statisticsAPI.getOverview(selectedPeriod);
        setStats({ ...defaultStats, ...(data || {}) });
      } catch (e) {
        setError("Impossible de charger les statistiques.");
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
  }, [selectedPeriod]);

  const kpiData = stats.kpis || defaultStats.kpis;
  const financeByMonth = Array.isArray(stats.finance_by_month) ? stats.finance_by_month : [];
  const invoiceStatus = Array.isArray(stats.invoice_status) ? stats.invoice_status : [];
  const topActs = Array.isArray(stats.top_acts) ? stats.top_acts : [];
  const appointmentsByDay = Array.isArray(stats.appointments_by_day) ? stats.appointments_by_day : [];

  const totalRevenue = Number(kpiData.revenue_collected || 0);
  const totalExpenses = Number(kpiData.expenses_total || 0);
  const netResult = Number(kpiData.net_result || 0);
  const paidInvoices = Number(kpiData.invoices_paid || 0);
  const pendingInvoices = Number(kpiData.invoices_pending || 0);

  const kpis = [
    {
      label: "Recettes encaissees",
      value: formatMoney(totalRevenue),
      trend: "-",
      color: "emerald",
      icon: BanknotesIcon,
    },
    {
      label: "Depenses achats",
      value: formatMoney(totalExpenses),
      trend: "-",
      color: "red",
      icon: ShoppingCartIcon,
    },
    {
      label: "Resultat net",
      value: formatMoney(netResult),
      trend: "-",
      color: netResult >= 0 ? "blue" : "amber",
      icon: ScaleIcon,
    },
    {
      label: "Factures payees",
      value: String(paidInvoices),
      trend: "-",
      color: "indigo",
      icon: DocumentCheckIcon,
    },
    {
      label: "Factures non traitees",
      value: String(pendingInvoices),
      trend: "-",
      color: "amber",
      icon: DocumentTextIcon,
    },
    {
      label: "Nouveaux patients",
      value: String(kpiData.new_patients || 0),
      trend: "-",
      color: "blue",
      icon: UserPlusIcon,
    },
    {
      label: "RDV periode",
      value: String(kpiData.appointments_total || 0),
      trend: "-",
      color: "emerald",
      icon: CalendarIcon,
    },
    {
      label: "RDV annules",
      value: String(kpiData.appointments_cancelled || 0),
      trend: "-",
      color: "slate",
      icon: XCircleIcon,
    },
  ];

  const maxFinance = Math.max(
    1,
    ...financeByMonth.map((m) => Math.max(Number(m.revenue || 0), Number(m.expenses || 0)))
  );
  const maxDayValue = Math.max(1, ...appointmentsByDay.map((d) => Number(d.value || 0)));
  const maxActCount = Math.max(1, ...topActs.map((a) => Number(a.count || 0)));

  const receivableAmount = useMemo(() => {
    const pendingRatio = (pendingInvoices || 0) / Math.max((pendingInvoices || 0) + (paidInvoices || 0), 1);
    return Math.round((totalRevenue + totalExpenses) * pendingRatio * 0.5);
  }, [pendingInvoices, paidInvoices, totalRevenue, totalExpenses]);

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
          <p className="text-gray-600 mt-1">Vue consolidee achats + factures + activite</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Periode :</span>
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-xl px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timePeriods.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-gray-600">Chargement des statistiques...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              const isPositive = String(kpi.trend).startsWith("+");

              return (
                <div
                  key={kpi.label}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg ${badgeClasses[kpi.color].split(" ")[0]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">{kpi.label}</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badgeClasses[kpi.color]}`}>
                        {kpi.trend}
                      </span>
                      <div className="mt-1">
                        {isPositive ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recettes vs depenses (6 mois)</h2>
              <div className="flex items-end gap-2 h-56">
                {financeByMonth.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex justify-center gap-1.5">
                      <div
                        className="w-1/3 rounded-t bg-emerald-500"
                        style={{ height: `${(Number(m.revenue || 0) / maxFinance) * 85}%` }}
                        title={`Recettes: ${formatMoney(m.revenue)}`}
                      />
                      <div
                        className="w-1/3 rounded-t bg-red-400"
                        style={{ height: `${(Number(m.expenses || 0) / maxFinance) * 85}%` }}
                        title={`Depenses: ${formatMoney(m.expenses)}`}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{m.month}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-5 mt-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span>Recettes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-400" />
                  <span>Depenses</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Etat des factures</h2>
              <div className="space-y-4">
                {invoiceStatus.map((s) => {
                  const total = paidInvoices + pendingInvoices || 1;
                  const percent = Math.round((Number(s.value || 0) / total) * 100);
                  const colorClass =
                    s.label === "Payees"
                      ? "from-emerald-500 to-emerald-300"
                      : "from-amber-500 to-amber-300";

                  return (
                    <div key={s.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{s.label}</span>
                        <span className="text-gray-900 font-semibold">
                          {s.value} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full">
                        <div
                          className={`h-2 rounded-full bg-gradient-to-r ${colorClass}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="text-xs text-emerald-700">Encaissement total</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{formatMoney(totalRevenue)}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-xs text-amber-700">A encaisser</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{formatMoney(receivableAmount)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Top actes factures</h2>
              <div className="space-y-3">
                {topActs.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune donnee d'actes sur cette periode.</p>
                ) : (
                  topActs.map((act) => (
                    <div
                      key={act.name}
                      className="group hover:bg-slate-50 p-2 rounded-lg transition-colors duration-150"
                    >
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 font-medium">{act.name}</span>
                        <div className="text-right">
                          <p className="text-gray-900 font-semibold">{act.count} actes</p>
                          <p className="text-xs text-gray-500">{formatMoney(act.revenue)}</p>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-300"
                          style={{ width: `${Math.max((Number(act.count || 0) / maxActCount) * 100, 8)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Activite RDV (7 jours)</h2>
              <div className="flex items-end gap-3 h-44 mb-3">
                {appointmentsByDay.map((d, index) => (
                  <div key={`${d.day}-${index}`} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-3/4 rounded-t-lg bg-gradient-to-t from-indigo-500 to-indigo-300"
                      style={{ height: `${Math.max((Number(d.value || 0) / maxDayValue) * 100, 10)}%` }}
                      title={`${d.value} RDV`}
                    />
                    <span className="text-xs text-gray-600">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Synthese metier</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100">
                <p className="text-gray-500 text-sm">Recettes encaissees</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatMoney(totalRevenue)}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-white border border-red-100">
                <p className="text-gray-500 text-sm">Depenses achats</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatMoney(totalExpenses)}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
                <p className="text-gray-500 text-sm">Resultat net</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatMoney(netResult)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
};

export default Statistics;
