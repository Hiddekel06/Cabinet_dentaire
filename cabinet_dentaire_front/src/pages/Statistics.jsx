import React, { useState } from "react";
import { Layout } from "../components/Layout";
import {
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const kpis = [
  { label: "RDV ce mois", value: "128", trend: "+12%", color: "emerald", icon: CalendarIcon },
  { label: "Taux d'occupation", value: "86%", trend: "+4%", color: "blue", icon: ChartBarIcon },
  { label: "Patients nouveaux", value: "24", trend: "+8%", color: "amber", icon: UserGroupIcon },
  { label: "RDV annulés", value: "9", trend: "-2%", color: "red", icon: ClockIcon },
  { label: "Revenus moyens/jour", value: "85k", trend: "+5%", color: "indigo", icon: CurrencyDollarIcon },
  { label: "Durée moyenne", value: "32min", trend: "-3%", color: "purple", icon: ClockIcon },
];

const topTreatments = [
  { name: "Consultation", count: 46, percent: 38, revenue: "450k" },
  { name: "Détartrage", count: 32, percent: 26, revenue: "320k" },
  { name: "Implant", count: 18, percent: 15, revenue: "1.2M" },
  { name: "Extraction", count: 14, percent: 12, revenue: "280k" },
  { name: "Orthodontie", count: 10, percent: 8, revenue: "800k" },
];

const weeklyActivity = [
  { day: "Lun", value: 18, revenue: "153k" },
  { day: "Mar", value: 22, revenue: "187k" },
  { day: "Mer", value: 16, revenue: "136k" },
  { day: "Jeu", value: 26, revenue: "221k" },
  { day: "Ven", value: 21, revenue: "179k" },
  { day: "Sam", value: 9, revenue: "77k" },
  { day: "Dim", value: 4, revenue: "34k" },
];

const monthlyComparison = [
  { month: "Jan", current: 112, previous: 98 },
  { month: "Fév", current: 128, previous: 105 },
  { month: "Mar", current: 145, previous: 118 },
  { month: "Avr", current: 132, previous: 121 },
  { month: "Mai", current: 157, previous: 129 },
  { month: "Juin", current: 128, previous: 115 },
];

const patientSegments = [
  { type: "Enfants", count: 42, percent: 35, color: "blue" },
  { type: "Adultes", count: 58, percent: 48, color: "emerald" },
  { type: "Séniors", count: 20, percent: 17, color: "amber" },
];

const timePeriods = ["Aujourd'hui", "Cette semaine", "Ce mois", "Ce trimestre", "Cette année"];

const badgeClasses = {
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  indigo: "bg-indigo-100 text-indigo-700",
  purple: "bg-purple-100 text-purple-700",
};

const segmentColors = {
  blue: "#3b82f6",
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  indigo: "#6366f1",
  purple: "#a855f7",
};

const Statistics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("Ce mois");
  const [expandedChart, setExpandedChart] = useState(false);

  const maxValue = Math.max(...weeklyActivity.map(d => d.value));
  const maxMonthValue = Math.max(...monthlyComparison.map(m => Math.max(m.current, m.previous)));
  const totalSegments = patientSegments.reduce((sum, s) => sum + s.percent, 0) || 100;
  let segmentStart = 0;
  const segmentGradient = patientSegments
    .map((segment) => {
      const slice = (segment.percent / totalSegments) * 360;
      const start = segmentStart;
      const end = segmentStart + slice;
      segmentStart = end;
      return `${segmentColors[segment.color] || "#94a3b8"} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
          <p className="text-gray-600 mt-1">Aperçu des performances et de l'activité du cabinet</p>
        </div>
        
        {/* Sélecteur de période */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Période :</span>
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-xl px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timePeriods.map((period) => (
                <option key={period} value={period}>{period}</option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* KPIs améliorés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.trend.startsWith('+');
          
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${badgeClasses[kpi.color].split(' ')[0]}`}>
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
        {/* Activité hebdomadaire améliorée */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Activité hebdomadaire</h2>
              <p className="text-sm text-gray-500">7 derniers jours • Total : 116 RDV</p>
            </div>
            <button
              onClick={() => setExpandedChart(!expandedChart)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {expandedChart ? "Réduire" : "Voir détails"}
            </button>
          </div>
          
          <div className="flex items-end gap-3 h-40 mb-4">
            {weeklyActivity.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group relative">
                <div className="w-full flex flex-col items-center">
                  <div
                    className="w-3/4 rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-300 group-hover:from-blue-600 group-hover:to-blue-400 transition-all duration-200 cursor-pointer"
                    style={{ 
                      height: expandedChart 
                        ? `${(d.value / maxValue) * 100}%` 
                        : `${Math.max(d.value * 3, 10)}px` 
                    }}
                  />
                  {expandedChart && (
                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-900 text-white text-xs py-1 px-2 rounded">
                      {d.value} RDV • {d.revenue}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <span className="text-xs text-gray-600 font-medium">{d.day}</span>
                  {expandedChart && (
                    <p className="text-xs text-gray-500 mt-1">{d.revenue}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Légende */}
          <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gradient-to-t from-blue-500 to-blue-300" />
                <span>Nombre de RDV</span>
              </div>
              {expandedChart && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gradient-to-t from-emerald-500 to-emerald-300" />
                  <span>Revenus</span>
                </div>
              )}
            </div>
            <span>Pic : {Math.max(...weeklyActivity.map(d => d.value))} RDV</span>
          </div>
        </div>

        {/* Traitements les plus fréquents améliorés */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Traitements les plus fréquents</h2>
              <p className="text-sm text-gray-500">Ce mois • Triés par fréquence</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">120 traitements</p>
              <p className="text-xs text-gray-500">Total ce mois</p>
            </div>
          </div>
          <div className="space-y-4">
            {topTreatments.map((t) => (
              <div key={t.name} className="group hover:bg-slate-50 p-2 rounded-lg transition-colors duration-150">
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700 font-medium">{t.name}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{t.revenue} FCFA</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-900 font-semibold">{t.count}</span>
                    <span className="text-gray-500">({t.percent}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-300 group-hover:from-blue-600 group-hover:to-blue-400 transition-all duration-300"
                    style={{ width: `${t.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deuxième ligne de graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Comparaison mensuelle */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Évolution mensuelle</h2>
          <div className="flex items-end gap-2 h-48">
            {monthlyComparison.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex justify-center gap-1">
                  <div
                    className="w-1/3 rounded-t bg-gray-300"
                    style={{ height: `${(m.previous / maxMonthValue) * 80}%` }}
                  />
                  <div
                    className="w-1/3 rounded-t bg-gradient-to-t from-blue-500 to-blue-300"
                    style={{ height: `${(m.current / maxMonthValue) * 80}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600">{m.month}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-gray-600">{selectedPeriod.split(' ')[1] || "2024"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-300" />
              <span className="text-gray-600">Période précédente</span>
            </div>
          </div>
        </div>

        {/* Segmentation des patients */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Segmentation des patients</h2>
          <div className="flex items-center justify-center h-48">
            <div className="relative w-48 h-48">
              {/* Diagramme circulaire simplifié */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">120</p>
                  <p className="text-sm text-gray-500">patients</p>
                </div>
              </div>
              <div
                className="w-full h-full rounded-full border-8 border-transparent"
                style={{ background: `conic-gradient(${segmentGradient})` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {patientSegments.map((segment) => (
              <div key={segment.type} className="text-center p-2 rounded-lg bg-slate-50">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded ${badgeClasses[segment.color].split(' ')[0]}`} />
                  <span className="text-sm font-medium text-gray-900">{segment.type}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{segment.count}</p>
                <p className="text-xs text-gray-500">{segment.percent}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Détails supplémentaires améliorés */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Synthèse des performances</h2>
          <span className="text-sm text-gray-500">Mise à jour : Aujourd'hui, 14:30</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100">
            <p className="text-gray-500">Revenus estimés</p>
            <p className="text-xl font-bold text-gray-900">2 450 000 FCFA</p>
            <div className="flex items-center gap-1 mt-2">
              <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />
              <p className="text-xs text-emerald-600 font-medium">+6% vs mois précédent</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-100">
            <p className="text-gray-500">Taux d'absentéisme</p>
            <p className="text-xl font-bold text-gray-900">5%</p>
            <p className="text-xs text-amber-600 font-medium mt-2">À surveiller</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
            <p className="text-gray-500">Satisfaction patient</p>
            <p className="text-xl font-bold text-gray-900">4.7/5</p>
            <p className="text-xs text-blue-600 font-medium mt-2">Excellent</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-white border border-purple-100">
            <p className="text-gray-500">Rétention</p>
            <p className="text-xl font-bold text-gray-900">92%</p>
            <div className="flex items-center gap-1 mt-2">
              <ArrowTrendingUpIcon className="w-4 h-4 text-purple-500" />
              <p className="text-xs text-purple-600 font-medium">+3%</p>
            </div>
          </div>
        </div>
        
        {/* Résumé texte */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Points clés</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
              <span>Croissance constante des nouveaux patients (+8% ce mois)</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
              <span>Jeudi est le jour le plus productif avec 26 RDV</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
              <span>Segment adulte représente 48% de la patientèle</span>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default Statistics;