import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { dashboardAPI } from '../services/api';

const statusClasses = {
  Nouveau: 'bg-blue-50 text-blue-700 border-blue-100',
  Suivi: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'En traitement': 'bg-amber-50 text-amber-700 border-amber-100',
};

const appointmentTypeStyles = [
  {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    dot: 'bg-blue-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    dot: 'bg-orange-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

const initialData = {
  cards: {
    patients_total: { value: 0, trend_percent: 0 },
    appointments_today: { value: 0, pending_count: 0 },
    new_patients_period: { value: 0, trend_percent: 0 },
    invoices_pending: { value: 0, ratio_percent: 0 },
  },
  recent_patients: [],
  today_appointments: [],
  daily_summary: {
    patients_by_slot: [],
    acts_breakdown: [],
    remaining_appointments: { value: 0, total_today: 0 },
    quick_indicators: {
      new_patients_today: 0,
      attendance_rate_percent: 0,
      average_duration_minutes: 0,
      vs_yesterday_percent: 0,
      appointments_completed_today: 0,
    },
  },
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
};

const getInitials = (firstName, lastName) => {
  const f = (firstName || '').trim().charAt(0).toUpperCase();
  const l = (lastName || '').trim().charAt(0).toUpperCase();
  return `${f}${l}` || 'P';
};

const getTrendText = (trendPercent, suffix) => {
  const n = Number(trendPercent || 0);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}% ${suffix}`;
};

export const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardAPI.getOverview('month');
      setData({ ...initialData, ...(res.data || {}) });
    } catch (e) {
      setError('Impossible de charger les données du dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const cards = data.cards || initialData.cards;
  const recentPatients = Array.isArray(data.recent_patients) ? data.recent_patients : [];
  const todayAppointments = Array.isArray(data.today_appointments) ? data.today_appointments : [];
  const summary = data.daily_summary || initialData.daily_summary;

  const slotMax = Math.max(
    1,
    ...(Array.isArray(summary.patients_by_slot) ? summary.patients_by_slot : []).map((slot) => Number(slot.count || 0))
  );

  const actsBreakdown = useMemo(() => {
    const rows = Array.isArray(summary.acts_breakdown) ? summary.acts_breakdown : [];
    return rows.slice(0, 4);
  }, [summary.acts_breakdown]);

  const totalActs = actsBreakdown.reduce((sum, act) => sum + Number(act.count || 0), 0);

  const cardItems = [
    {
      label: 'Patients totaux',
      value: cards.patients_total?.value ?? 0,
      subLabel: getTrendText(cards.patients_total?.trend_percent, 'ce mois'),
      subColor: 'text-green-600',
      progress: 78,
      progressGradient: 'from-blue-400 to-blue-600',
      circleGradient: 'from-blue-300 to-blue-100',
      iconPath: 'M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z',
      iconColor: 'text-green-600',
    },
    {
      label: "Rendez-vous aujourd'hui",
      value: cards.appointments_today?.value ?? 0,
      subLabel: `${cards.appointments_today?.pending_count ?? 0} en attente`,
      subColor: 'text-amber-600',
      progress: Math.min(((cards.appointments_today?.value ?? 0) / 20) * 100, 100),
      progressGradient: 'from-teal-400 to-teal-600',
      circleGradient: 'from-emerald-300 to-emerald-100',
      iconPath: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Nouveaux patients',
      value: cards.new_patients_period?.value ?? 0,
      subLabel: `${getTrendText(cards.new_patients_period?.trend_percent, 'vs période préc.')}`,
      subColor: 'text-emerald-600',
      progress: Math.min(((cards.new_patients_period?.value ?? 0) / 40) * 100, 100),
      progressGradient: 'from-emerald-400 to-emerald-600',
      circleGradient: 'from-orange-300 to-orange-100',
      iconPath: 'M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Factures non traitées',
      value: cards.invoices_pending?.value ?? 0,
      subLabel: `${cards.invoices_pending?.ratio_percent ?? 0}% du total`,
      subColor: 'text-blue-600',
      progress: Math.min(cards.invoices_pending?.ratio_percent ?? 0, 100),
      progressGradient: 'from-red-400 to-red-600',
      circleGradient: 'from-blue-300 to-blue-100',
      iconPath: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
      iconColor: 'text-blue-600',
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-white p-6">
        <div className="mb-4">
          <h1 className="text-base font-medium text-gray-600">
            Bienvenue, <span className="text-gray-700">Dr. {user?.name || 'Utilisateur'}</span>
          </h1>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between">
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={loadDashboard}
              className="ml-4 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              Réessayer
            </button>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="h-3 w-24 bg-gray-200 rounded mb-4" />
                  <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-32 bg-gray-100 rounded mt-2" />
                  <div className="h-1.5 w-full bg-gray-100 rounded-full mt-6" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6">
                <div className="h-5 w-36 bg-gray-200 rounded mb-6" />
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-gray-200 rounded" />
                        <div className="h-3 w-48 bg-gray-100 rounded" />
                      </div>
                      <div className="h-6 w-20 bg-gray-100 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="h-5 w-40 bg-gray-200 rounded mb-6" />
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {cardItems.map((card) => (
                <div key={card.label} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden relative">
                  <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${card.circleGradient} to-transparent rounded-full -translate-x-10 -translate-y-10 opacity-100 pointer-events-none`} />
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-3">{card.label}</p>
                      <h2 className="text-3xl font-semibold text-gray-800 mb-1">{card.value}</h2>
                      <div className="flex items-center mt-1">
                        <svg className={`w-3 h-3 mr-1 ${card.iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d={card.iconPath} clipRule="evenodd" />
                        </svg>
                        <span className={`${card.subColor} text-xs font-medium`}>{card.subLabel}</span>
                      </div>
                    </div>
                    <div className="flex items-end mt-4 h-6">
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex items-center">
                        <div className={`h-full bg-gradient-to-r ${card.progressGradient} rounded-full`} style={{ width: `${Math.max(0, Math.min(100, card.progress))}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-lg bg-gradient-to-br from-white/80 via-blue-50/60 to-white/90 backdrop-blur-sm transition-all duration-300 group hover:shadow-2xl hover:border-blue-200">
                  <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Patients récents</h2>
                      <p className="text-gray-500 text-sm mt-1">Derniers patients ajoutés au système</p>
                    </div>
                    <div className="mt-3 sm:mt-0">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-orange-500 text-xs font-medium rounded bg-orange-50 border border-orange-100">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nouveau patient
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Patient</th>
                          <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Contact</th>
                          <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Dernière visite</th>
                          <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {recentPatients.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-500">Aucun patient récent.</td>
                          </tr>
                        ) : (
                          recentPatients.map((patient) => {
                            const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient';
                            return (
                              <tr key={patient.id} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="py-4 px-4">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center mr-3">
                                      <span className="font-semibold text-blue-600 text-xs">{getInitials(patient.first_name, patient.last_name)}</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900 text-xs truncate max-w-[150px]">{fullName}</p>
                                      <p className="text-gray-500 text-xs mt-0.5">{patient.display_id}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <p className="font-medium text-gray-900 text-sm">{patient.phone || '-'}</p>
                                  <p className="text-gray-500 text-xs truncate max-w-[180px] mt-1">{patient.email || '-'}</p>
                                </td>
                                <td className="py-4 px-4">
                                  <p className="font-medium text-gray-900 text-sm">{formatDate(patient.last_appointment_date)}</p>
                                  <p className="text-gray-500 text-xs mt-1">{patient.last_treatment || '-'}</p>
                                </td>
                                <td className="py-4 px-4">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusClasses[patient.status_label] || statusClasses.Nouveau}`}>
                                    {patient.status_label || 'Nouveau'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-gray-500 text-sm">Affichage de {recentPatients.length} patient{recentPatients.length > 1 ? 's' : ''}</p>
                    <button className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 rounded-lg transition-all duration-200">
                      Voir patients
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Rendez-vous du jour</h3>
                    <span className="text-sm text-gray-500">{todayAppointments.length} au total</span>
                  </div>
                  <div className="space-y-4">
                    {todayAppointments.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucun rendez-vous aujourd'hui.</p>
                    ) : (
                      todayAppointments.slice(0, 5).map((appointment, index) => {
                        const style = appointmentTypeStyles[index % appointmentTypeStyles.length];
                        return (
                          <div key={appointment.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors duration-200">
                            <div className="flex items-start">
                              <div className={`mt-0.5 mr-3 p-1.5 rounded-lg ${style.bg}`}>
                                <div className={style.text}>{style.icon}</div>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{appointment.time} - {appointment.patient_name}</p>
                                <p className="text-gray-600 text-xs mt-1 flex items-center">
                                  <span className={`w-2 h-2 rounded-full ${style.dot} mr-1.5`} />
                                  {appointment.reason || 'Consultation'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center w-full mt-8 mb-6">
              <div className="relative overflow-hidden rounded-3xl shadow-xl border border-gray-100 bg-gradient-to-br from-white via-gray-50 to-blue-50 w-full max-w-5xl p-8">
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-center justify-between mb-8">
                    <div className="flex items-center space-x-3 mb-4 md:mb-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Résumé du jour</h3>
                        <p className="text-sm text-gray-600">Analyse visuelle des activités</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">Patients par heure</h4>
                          <p className="text-xs text-gray-500">Distribution horaire</p>
                        </div>
                        <span className="text-xs font-medium text-blue-600">{cards.appointments_today?.value ?? 0} patients</span>
                      </div>
                      <div className="space-y-2">
                        {(summary.patients_by_slot || []).map((slot) => (
                          <div key={slot.slot} className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">{slot.slot}</span>
                            <div className="flex-1 mx-3">
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                                  style={{ width: `${Math.max((Number(slot.count || 0) / slotMax) * 100, 6)}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-xs font-medium text-gray-900">{slot.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">Types d'actes</h4>
                          <p className="text-xs text-gray-500">Répartition des soins</p>
                        </div>
                        <span className="text-xs font-medium text-green-600">{totalActs} actes</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {actsBreakdown.length === 0 ? (
                          <p className="text-sm text-gray-500 col-span-2">Aucun acte disponible sur la période.</p>
                        ) : (
                          actsBreakdown.map((act, index) => {
                            const colors = ['emerald', 'blue', 'purple', 'amber'];
                            const c = colors[index % colors.length];
                            const bg = c === 'emerald' ? 'bg-emerald-50' : c === 'blue' ? 'bg-blue-50' : c === 'purple' ? 'bg-purple-50' : 'bg-amber-50';
                            const text = c === 'emerald' ? 'text-emerald-700' : c === 'blue' ? 'text-blue-700' : c === 'purple' ? 'text-purple-700' : 'text-amber-700';
                            const sub = c === 'emerald' ? 'text-emerald-600' : c === 'blue' ? 'text-blue-600' : c === 'purple' ? 'text-purple-600' : 'text-amber-600';

                            return (
                              <div key={act.label} className={`flex flex-col items-center p-3 ${bg} rounded-xl`}>
                                <div className={`text-lg font-bold ${text}`}>{act.count}</div>
                                <div className={`text-xs ${sub} text-center mt-1`}>{act.label}</div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">Rendez-vous restants</h4>
                          <p className="text-xs text-gray-500">Fin de journée</p>
                        </div>
                        <span className="text-xs font-medium text-orange-600">{summary.remaining_appointments?.value ?? 0} RDV</span>
                      </div>
                      <div className="text-center py-4">
                        <div className="text-3xl font-bold text-gray-900">{summary.remaining_appointments?.value ?? 0}</div>
                        <p className="text-xs text-gray-500 mt-1">Sur {summary.remaining_appointments?.total_today ?? 0} rendez-vous prévus</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">Indicateurs clés</h4>
                          <p className="text-xs text-gray-500">Aujourd'hui</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Nouveaux patients</span><span className="font-semibold text-gray-900">{summary.quick_indicators?.new_patients_today ?? 0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Taux de présence</span><span className="font-semibold text-gray-900">{summary.quick_indicators?.attendance_rate_percent ?? 0}%</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Durée moyenne</span><span className="font-semibold text-gray-900">{summary.quick_indicators?.average_duration_minutes ?? 0} min</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Vs hier</span><span className="font-semibold text-gray-900">{summary.quick_indicators?.vs_yesterday_percent ?? 0}%</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-500">
                    <span>Enregistrement en temps réel</span>
                    <span>Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};
