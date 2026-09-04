import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { statisticsAPI, settingAPI } from "../services/api";
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

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const getTodayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getFirstDayOfMonthStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
};

const timePeriods = [
  { label: "Ce mois", value: "month" },
  { label: "Mois dernier", value: "last_month" },
  { label: "Ce trimestre", value: "quarter" },
  { label: "Cette année", value: "year" },
  { label: "Période personnalisée", value: "custom" },
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
  meta: {
    generated_at: null,
  },
  kpis: {
    revenue_collected: 0,
    expenses_total: 0,
    net_result: 0,
    receivable_amount: 0,
    invoices_paid: 0,
    invoices_pending: 0,
    session_receipts_paid: 0,
    session_receipts_pending: 0,
    new_patients: 0,
    appointments_total: 0,
    appointments_cancelled: 0,
  },
  invoice_status: [
    { key: "paid", label: "Payées", value: 0, color: "emerald" },
    { key: "pending", label: "Non traitées", value: 0, color: "amber" },
  ],
  trends: {
    revenue_collected_percent: 0,
    expenses_total_percent: 0,
    net_result_percent: 0,
    invoices_paid_percent: 0,
    invoices_pending_percent: 0,
    session_receipts_paid_percent: 0,
    session_receipts_pending_percent: 0,
    new_patients_percent: 0,
    appointments_total_percent: 0,
    appointments_cancelled_percent: 0,
  },
  receipt_status: [
    { key: "paid", label: "Reçus payés", value: 0, color: "emerald" },
    { key: "pending", label: "Reçus non payés", value: 0, color: "amber" },
  ],
  top_acts: [],
  appointments_by_day: [],
  finance_by_month: [],
};

const formatTrend = (value) => {
  const n = Number(value || 0);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}%`;
};

const Statistics = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [startDate, setStartDate] = useState(getFirstDayOfMonthStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Gestion du déverrouillage préalable par Code Confidentiel (PIN)
  const [statsUnlocked, setStatsUnlocked] = useState(false);
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState(false);
  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [confidentialCode, setConfidentialCode] = useState('1990');

  useEffect(() => {
    settingAPI.getAll().then(({ data }) => {
      if (data?.cabinet_confidential_code) {
        setConfidentialCode(data.cabinet_confidential_code);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      settingAPI.getAll().then(({ data }) => {
        if (data?.cabinet_confidential_code) {
          setConfidentialCode(data.cabinet_confidential_code);
        }
      }).catch(() => {});
    };
    window.addEventListener('cabinet-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('cabinet-settings-updated', handleSettingsUpdate);
  }, []);

  // Focus automatique sur le premier input du PIN au chargement
  useEffect(() => {
    if (!statsUnlocked) {
      const timer = setTimeout(() => {
        pinRefs[0].current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [statsUnlocked]);

  const handlePinDigit = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...pinDigits];
    next[index] = value;
    setPinDigits(next);
    setPinError(false);
    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
    if (value && index === 3) {
      const code = next.join('');
      if (code === confidentialCode) {
        setStatsUnlocked(true);
        setPinDigits(['', '', '', '']);
        setPinError(false);
      } else {
        setPinError(true);
        setPinDigits(['', '', '', '']);
        setTimeout(() => pinRefs[0].current?.focus(), 50);
      }
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handleCancelAccess = () => {
    navigate('/dashboard');
  };

  const loadOverview = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await statisticsAPI.getOverview(selectedPeriod, startDate, endDate);
      setStats({ ...defaultStats, ...(data || {}) });
    } catch (e) {
      setError("Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (statsUnlocked) {
      if (selectedPeriod === 'custom') {
        if (startDate && endDate) {
          loadOverview();
        }
      } else {
        loadOverview();
      }
    }
  }, [selectedPeriod, startDate, endDate, statsUnlocked]);

  // Écran d'accès verrouillé (si le code n'est pas encore validé)
  if (!statsUnlocked) {
    return (
      <Layout>
        <div className="min-h-[75vh] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 p-8 flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">Code confidentiel requis</h2>
              <p className="text-xs text-slate-500 mt-2">
                Saisissez votre code PIN pour accéder à la vue des statistiques
              </p>
            </div>

            <div className="flex gap-3 my-2">
              {pinDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={pinRefs[i]}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinDigit(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-2xl font-black rounded-xl border-2 outline-none transition-all
                    ${
                      pinError
                        ? 'border-red-400 bg-red-50 text-red-600 animate-pulse'
                        : digit
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-slate-400'
                    }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-xs font-semibold text-red-500">Code incorrect, réessayez.</p>
            )}

            <button
              type="button"
              onClick={handleCancelAccess}
              className="w-full py-3 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all uppercase tracking-wider border border-slate-200"
            >
              Annuler
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const kpiData = stats.kpis || defaultStats.kpis;
  const financeByMonth = Array.isArray(stats.finance_by_month) ? stats.finance_by_month : [];
  const invoiceStatus = Array.isArray(stats.invoice_status) ? stats.invoice_status : [];
  const receiptStatus = Array.isArray(stats.receipt_status) ? stats.receipt_status : [];
  const topActs = Array.isArray(stats.top_acts) ? stats.top_acts : [];
  const appointmentsByDay = Array.isArray(stats.appointments_by_day) ? stats.appointments_by_day : [];
  const trends = stats.trends || defaultStats.trends;

  const totalRevenue = Number(kpiData.revenue_collected || 0);
  const totalExpenses = Number(kpiData.expenses_total || 0);
  const netResult = Number(kpiData.net_result || 0);
  const receivableAmount = Number(kpiData.receivable_amount || 0);
  const paidInvoices = Number(kpiData.invoices_paid || 0);
  const pendingInvoices = Number(kpiData.invoices_pending || 0);
  const paidReceipts = Number(kpiData.session_receipts_paid || 0);
  const pendingReceipts = Number(kpiData.session_receipts_pending || 0);

  const kpis = [
    {
      label: "Recettes encaissées",
      value: formatMoney(totalRevenue),
      trend: formatTrend(trends.revenue_collected_percent),
      color: "emerald",
      icon: BanknotesIcon,
    },
    {
      label: "Dépenses achats",
      value: formatMoney(totalExpenses),
      trend: formatTrend(trends.expenses_total_percent),
      color: "red",
      icon: ShoppingCartIcon,
    },
    {
      label: "Résultat net",
      value: formatMoney(netResult),
      trend: formatTrend(trends.net_result_percent),
      color: netResult >= 0 ? "blue" : "amber",
      icon: ScaleIcon,
    },
    {
      label: "Factures payées",
      value: String(paidInvoices),
      trend: formatTrend(trends.invoices_paid_percent),
      color: "indigo",
      icon: DocumentCheckIcon,
    },
    {
      label: "Factures non traitées",
      value: String(pendingInvoices),
      trend: formatTrend(trends.invoices_pending_percent),
      color: "amber",
      icon: DocumentTextIcon,
    },
    {
      label: "Reçus payés",
      value: String(paidReceipts),
      trend: formatTrend(trends.session_receipts_paid_percent),
      color: "emerald",
      icon: DocumentCheckIcon,
    },
    {
      label: "Reçus non payés",
      value: String(pendingReceipts),
      trend: formatTrend(trends.session_receipts_pending_percent),
      color: "amber",
      icon: DocumentTextIcon,
    },
    {
      label: "Nouveaux patients",
      value: String(kpiData.new_patients || 0),
      trend: formatTrend(trends.new_patients_percent),
      color: "blue",
      icon: UserPlusIcon,
    },
    {
      label: "RDV période",
      value: String(kpiData.appointments_total || 0),
      trend: formatTrend(trends.appointments_total_percent),
      color: "emerald",
      icon: CalendarIcon,
    },
    {
      label: "RDV annulés",
      value: String(kpiData.appointments_cancelled || 0),
      trend: formatTrend(trends.appointments_cancelled_percent),
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

  return (
    <Layout>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Statistiques</h1>
          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs sm:text-sm text-gray-500">
            <span>Vue consolidée achats + factures + activité</span>
            {stats?.period?.from && stats?.period?.to && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                {stats.period.label || 'Période'}: {new Date(stats.period.from).toLocaleDateString('fr-FR')} au {new Date(stats.period.to).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bouton de verrouillage manuelle */}
          <button
            type="button"
            onClick={() => {
              setStatsUnlocked(false);
              setPinDigits(['', '', '', '']);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            title="Verrouiller la vue des statistiques"
          >
            <LockIcon />
            <span>Verrouiller</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Période :</span>
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-xl px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              >
                {timePeriods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {selectedPeriod === 'custom' && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl shadow-xs">
                <span className="text-xs font-medium text-slate-500 pl-1">Du</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                />
                <span className="text-xs font-medium text-slate-500">au</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {stats?.meta?.generated_at && !loading && (
        <div className="mb-3 text-xs text-gray-500">
          Dernière mise à jour: {new Date(stats.meta.generated_at).toLocaleString('fr-FR')}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={loadOverview}
            className="px-3 py-1 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold"
          >
            Réessayer
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 animate-pulse">
                <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
                <div className="h-8 w-24 bg-gray-200 rounded mb-3" />
                <div className="h-4 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 animate-pulse h-80" />
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 animate-pulse h-80" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              const isPositive = String(kpi.trend).startsWith("+");

              return (
                <div
                  key={kpi.label}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all duration-200"
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
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recettes vs dépenses (6 mois)</h2>
              <p className="text-xs text-gray-500 mb-3">Les recettes incluent les factures encaissées et les reçus de séance payés.</p>
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
                        title={`Dépenses: ${formatMoney(m.expenses)}`}
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
                  <span>Dépenses</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4">État des paiements</h2>
              <div className="space-y-4">
                {invoiceStatus.map((s) => {
                  const total = paidInvoices + pendingInvoices || 1;
                  const percent = Math.round((Number(s.value || 0) / total) * 100);

                  return (
                    <div key={s.key || s.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{s.label}</span>
                        <span className="font-semibold text-gray-900">
                          {s.value} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full">
                        <div
                          className={`h-2 rounded-full bg-gradient-to-r ${
                            s.color === "emerald"
                              ? "from-emerald-500 to-emerald-300"
                              : "from-amber-500 to-amber-300"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {receiptStatus.map((s) => {
                  const total = paidReceipts + pendingReceipts || 1;
                  const percent = Math.round((Number(s.value || 0) / total) * 100);

                  return (
                    <div key={s.key || s.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{s.label}</span>
                        <span className="font-semibold text-gray-900">
                          {s.value} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full">
                        <div
                          className={`h-2 rounded-full bg-gradient-to-r ${
                            s.color === "emerald"
                              ? "from-emerald-500 to-emerald-300"
                              : "from-amber-500 to-amber-300"
                          }`}
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
                  <p className="text-sm font-bold mt-1 text-gray-900">
                    {formatMoney(totalRevenue)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-xs text-amber-700">À encaisser</p>
                  <p className="text-sm font-bold mt-1 text-gray-900">
                    {formatMoney(receivableAmount)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Top actes facturés</h2>
              <div className="space-y-3">
                {topActs.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune donnée d'actes sur cette période.</p>
                ) : (
                  topActs.map((act) => (
                    <div
                      key={act.name}
                      className="group hover:bg-slate-50 p-2 rounded-lg transition-colors duration-150"
                    >
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 font-medium">{act.name}</span>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {act.count} actes
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatMoney(act.revenue)}
                          </p>
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
              <h2 className="text-lg font-bold text-gray-900 mb-4">Activité RDV (7 jours)</h2>
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
            <h2 className="text-lg font-bold text-gray-900 mb-4">Synthèse métier</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100">
                <p className="text-gray-500 text-sm">Recettes encaissées</p>
                <p className="text-xl font-bold mt-1 text-gray-900">
                  {formatMoney(totalRevenue)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-white border border-red-100">
                <p className="text-gray-500 text-sm">Dépenses achats</p>
                <p className="text-xl font-bold mt-1 text-gray-900">
                  {formatMoney(totalExpenses)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
                <p className="text-gray-500 text-sm">Résultat net</p>
                <p className="text-xl font-bold mt-1 text-gray-900">
                  {formatMoney(netResult)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
};

export default Statistics;
