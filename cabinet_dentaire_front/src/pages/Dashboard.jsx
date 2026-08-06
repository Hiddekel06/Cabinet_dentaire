import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Can } from '../components/Can';
import { dashboardAPI, patientTreatmentAPI, doctorAPI, settingAPI } from '../services/api';

const statusClasses = {
  Nouveau: 'bg-blue-50 text-blue-700 border-blue-100',
  Diagnostic: 'bg-emerald-50 text-emerald-700 border-emerald-100',
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
  finance_summary: {
    today_collected: 0,
    week_collected: 0,
    month_collected: 0,
    today_details: [],
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

const getInitials = (name) => {
  if (!name) return 'P';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

const getTrendText = (trendPercent, suffix) => {
  const n = Number(trendPercent || 0);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}% ${suffix}`;
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [error, setError] = useState('');
  const [selectedRecentPatient, setSelectedRecentPatient] = useState(null);
  const [continuingTreatment, setContinuingTreatment] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [financeVisible, setFinanceVisible] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState(false);
  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [dashboardPin, setDashboardPin] = useState('1990');

  const isMultiDoctorMode = useMemo(() => doctors.length > 1, [doctors]);

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
      if (code === dashboardPin) {
        setFinanceVisible(true);
        setShowPinModal(false);
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

  const openPinModal = () => {
    setPinDigits(['', '', '', '']);
    setPinError(false);
    setShowPinModal(true);
    setTimeout(() => pinRefs[0].current?.focus(), 100);
  };

  const loadDoctors = useCallback(async () => {
    try {
      const res = await doctorAPI.getAll();
      setDoctors(res.data || []);
    } catch (error) {
      console.error('Erreur chargement médecins:', error);
    }
  }, []);

  const loadPendingActions = useCallback(async () => {
    if (user?.role !== 'secretary' && user?.role !== 'admin') return;
    setLoadingPending(true);
    try {
      const res = await dashboardAPI.getPendingActions();
      setPendingActions(res.data || []);
    } catch (e) {
      console.error('Erreur chargement actions en attente:', e);
    } finally {
      setLoadingPending(false);
    }
  }, [user?.role]);

  useEffect(() => {
    loadDashboard();
    loadDoctors();
    loadPendingActions();
    // Charger le code confidentiel depuis les paramètres du cabinet
    settingAPI.getAll().then(({ data }) => {
      if (data?.cabinet_confidential_code) {
        setDashboardPin(data.cabinet_confidential_code);
      }
    }).catch(() => { /* fallback sur '1990' */ });
  }, [loadDashboard, loadDoctors, loadPendingActions]);

  // Mettre à jour le PIN en temps réel si les paramètres changent
  useEffect(() => {
    const handleSettingsUpdate = () => {
      settingAPI.getAll().then(({ data }) => {
        if (data?.cabinet_confidential_code) {
          setDashboardPin(data.cabinet_confidential_code);
        }
      }).catch(() => {});
    };
    window.addEventListener('cabinet-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('cabinet-settings-updated', handleSettingsUpdate);
  }, []);


  const cards = data.cards || initialData.cards;
  const finance = data.finance_summary || initialData.finance_summary;
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

  const openPatientModal = (patient) => {
    setSelectedRecentPatient(patient || null);
  };

  const closePatientModal = () => {
    setSelectedRecentPatient(null);
  };

  const continueTreatment = async () => {
    if (!selectedRecentPatient?.id || continuingTreatment) return;

    setContinuingTreatment(true);
    try {
      const response = await patientTreatmentAPI.getAll();
      const treatments = response?.data?.data || response?.data || [];
      const activeTreatment = treatments.find((treatment) => (
        Number(treatment.patient_id) === Number(selectedRecentPatient.id)
        && ['planned', 'in_progress'].includes(treatment.status)
      ));

      if (activeTreatment?.id) {
        navigate(`/treatments/${activeTreatment.id}/session`);
      } else {
        navigate('/treatments/new', { state: { patientId: selectedRecentPatient.id } });
      }
      closePatientModal();
    } catch (e) {
      alert("Impossible d'ouvrir le traitement pour le moment.");
    } finally {
      setContinuingTreatment(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

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

  const cashWidgets = [
    {
      label: 'Encaissé aujourd\'hui',
      value: finance.today_collected,
      color: 'emerald',
      action: () => setShowCashModal(true),
      actionLabel: 'Voir journal'
    },
    {
      label: 'Cette semaine',
      value: finance.week_collected,
      color: 'blue'
    },
    {
      label: 'Ce mois',
      value: finance.month_collected,
      color: 'indigo'
    }
  ];

  // Icon œil ouvert
  const EyeOpenIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  // Icon œil fermé
  const EyeClosedIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-white p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-base font-medium text-gray-600">
            Bienvenue, <span className="text-gray-700">Dr. {user?.name || 'Utilisateur'}</span>
          </h1>
          <div className="text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Widgets de Caisse */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {cashWidgets.map((widget) => (
              <div
                key={widget.label}
                className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                  widget.color === 'emerald' ? 'border-emerald-100 hover:border-emerald-200' :
                  widget.color === 'blue' ? 'border-blue-100 hover:border-blue-200' :
                  'border-indigo-100 hover:border-indigo-200'
                }`}
              >
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${
                  widget.color === 'emerald' ? 'bg-emerald-500' :
                  widget.color === 'blue' ? 'bg-blue-500' :
                  'bg-indigo-500'
                }`} />

                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{widget.label}</p>
                    {financeVisible ? (
                      <h3 className={`text-2xl font-black ${
                        widget.color === 'emerald' ? 'text-emerald-600' :
                        widget.color === 'blue' ? 'text-blue-600' :
                        'text-indigo-600'
                      }`}>
                        {Number(widget.value).toLocaleString()} <span className="text-xs font-bold">XOF</span>
                      </h3>
                    ) : (
                      <h3 className={`text-2xl font-black tracking-widest ${
                        widget.color === 'emerald' ? 'text-emerald-300' :
                        widget.color === 'blue' ? 'text-blue-300' :
                        'text-indigo-300'
                      }`}>
                        ••••••
                      </h3>
                    )}
                  </div>

                  {/* Bouton oeil pour toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (financeVisible) {
                        setFinanceVisible(false);
                      } else {
                        openPinModal();
                      }
                    }}
                    className={`p-2 rounded-xl transition-all ${
                      widget.color === 'emerald' ? 'bg-emerald-50 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100' :
                      widget.color === 'blue' ? 'bg-blue-50 text-blue-400 hover:text-blue-600 hover:bg-blue-100' :
                      'bg-indigo-50 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100'
                    }`}
                    title={financeVisible ? 'Masquer les montants' : 'Afficher les montants'}
                  >
                    {financeVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </button>
                </div>

                {widget.action && financeVisible && (
                  <button
                    onClick={widget.action}
                    className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-tight"
                  >
                    {widget.actionLabel}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modale PIN */}
        {showPinModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md"
            onClick={() => setShowPinModal(false)}
          >
            <div
              className="bg-white w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-base font-bold text-slate-900">Code confidentiel</h3>
                  <p className="text-xs text-slate-400 mt-1">Saisissez votre PIN pour afficher les montants</p>
                </div>

                <div className="flex gap-3">
                  {pinDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={pinRefs[i]}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handlePinDigit(i, e.target.value)}
                      onKeyDown={e => handlePinKeyDown(i, e)}
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
                  onClick={() => setShowPinModal(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Journal de Caisse du jour */}
        {showCashModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowCashModal(false)}>
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-5 bg-emerald-600 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Journal de caisse</h3>
                  <p className="text-emerald-100 text-xs">Paiements reçus aujourd'hui</p>
                </div>
                <button onClick={() => setShowCashModal(false)} className="text-white/80 hover:text-white text-2xl font-bold">&times;</button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {finance.today_details.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 italic">Aucun encaissement pour le moment.</p>
                ) : (
                  <div className="space-y-3">
                    {finance.today_details.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-100 shadow-xs">
                            {item.time}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.patient_name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-medium">Encaissement séance</p>
                          </div>
                        </div>
                        <div className="text-sm font-black text-emerald-600">
                          +{Number(item.amount).toLocaleString()} <span className="text-[10px]">XOF</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total du jour</span>
                <span className="text-xl font-black text-emerald-600">{Number(finance.today_collected).toLocaleString()} XOF</span>
              </div>
            </div>
          </div>
        )}

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
                              <tr
                                key={patient.id}
                                className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                onClick={() => openPatientModal(patient)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openPatientModal(patient);
                                  }
                                }}
                              >
                                <td className="py-4 px-4">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center mr-3">
                                      <span className="font-semibold text-blue-600 text-xs">{getInitials(fullName)}</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900 text-xs truncate max-w-[150px] flex items-center gap-1.5">
                                        {fullName}
                                        {patient.date_of_birth && (
                                          <span className="text-gray-400 font-normal">({calculateAge(patient.date_of_birth)} ans)</span>
                                        )}
                                        {patient.general_state && (
                                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-400" title={`État général : ${patient.general_state}`}></span>
                                        )}
                                      </p>
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
                    <button onClick={() => navigate('/patients')} className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 rounded-lg transition-all duration-200">
                      Voir patients
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white shadow-sm border border-gray-200 p-6 rounded-2xl">
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

            {/* Section Relances Prioritaires (Seulement pour admin/secretaire en mode Multi) */}
            <Can roles={['admin', 'secretary']}>
              {isMultiDoctorMode && !loading && (
                <div className="mt-8 relative overflow-hidden rounded-2xl border border-rose-100 shadow-lg bg-gradient-to-br from-white via-rose-50/30 to-white backdrop-blur-sm transition-all duration-300 group hover:shadow-2xl">
                  <div className="px-6 py-4 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-rose-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-100 animate-pulse">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">🔔 Relances prioritaires</h2>
                        <p className="text-rose-600 text-xs font-bold mt-0.5 uppercase tracking-widest">Patients en attente de rendez-vous</p>
                      </div>
                    </div>
                    {pendingActions.length > 0 && (
                      <span className="mt-3 sm:mt-0 px-3 py-1 bg-rose-500 text-white text-[10px] font-black rounded-full uppercase tracking-tighter shadow-sm">
                        {pendingActions.length} Rappels à faire
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="text-left py-3 px-6 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Patient</th>
                          <th className="text-left py-3 px-6 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Soin en cours</th>
                          <th className="text-left py-3 px-6 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Dernière séance</th>
                          <th className="text-right py-3 px-6 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingPending ? (
                          <tr><td colSpan={4} className="py-12 text-center text-rose-500 font-bold animate-pulse italic text-sm">Analyse des dossiers en cours...</td></tr>
                        ) : pendingActions.length === 0 ? (
                          <tr><td colSpan={4} className="py-12 text-center text-slate-400 italic text-sm">Parfait ! Tous les patients ont un rendez-vous planifié. ✨</td></tr>
                        ) : (
                          pendingActions.map((action) => (
                            <tr key={action.treatment_id} className="hover:bg-rose-50/30 transition-colors duration-150 group/row">
                              <td className="py-4 px-6">
                                <div className="flex items-center">
                                  <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center mr-3 border border-rose-200">
                                    <span className="font-black text-rose-600 text-xs">{getInitials(action.patient_name)}</span>
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 text-sm">{action.patient_name}</p>
                                    <p className="text-rose-500 text-xs font-medium">{action.patient_phone || 'Pas de téléphone'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-700">{action.treatment_name}</span>
                                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">ID: #{action.treatment_id}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-100 text-slate-600 uppercase tracking-tighter border border-slate-200">
                                  Terminée {action.last_visit_date}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button 
                                  onClick={() => navigate('/appointments', { state: { patientId: action.patient_id, autoOpen: true } })}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-rose-500 text-rose-600 text-xs font-black rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm hover:shadow-rose-100"
                                >
                                  FIXER RDV
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Can>

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

        {selectedRecentPatient && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={closePatientModal}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-blue-100 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Détails patient</h3>
                  <p className="text-sm text-gray-500 mt-1 font-medium tracking-tight">Informations complètes du dossier</p>
                </div>
                <button
                  onClick={closePatientModal}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all text-2xl leading-none shadow-sm"
                  aria-label="Fermer"
                  type="button"
                >
                  &times;
                </button>
              </div>

              <div className="px-6 py-6 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white">
                <div className="rounded-2xl border border-gray-100 p-4 bg-slate-50 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Identifiant</p>
                  <p className="text-sm font-bold text-gray-900">{selectedRecentPatient.display_id || '-'}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 bg-slate-50 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nom complet</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">
                      {`${selectedRecentPatient.first_name || ''} ${selectedRecentPatient.last_name || ''}`.trim() || '-'}
                    </p>
                    {selectedRecentPatient.date_of_birth && (
                      <span className="text-[10px] text-blue-600 bg-blue-100/50 border border-blue-200 px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter">
                        {calculateAge(selectedRecentPatient.date_of_birth)} ans
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 bg-slate-50 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Téléphone</p>
                  <p className="text-sm font-bold text-gray-900">{selectedRecentPatient.phone || '-'}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 bg-slate-50 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email</p>
                  <p className="text-sm font-bold text-gray-900 break-all">{selectedRecentPatient.email || '-'}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 bg-slate-50 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Dernière visite</p>
                  <p className="text-sm font-bold text-gray-900">{formatDate(selectedRecentPatient.last_appointment_date)}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 p-4 bg-slate-50 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Dernier traitement</p>
                  <p className="text-sm font-bold text-gray-900">{selectedRecentPatient.last_treatment || '-'}</p>
                </div>
                
                <div className="rounded-2xl border border-amber-100 p-4 bg-amber-50 sm:col-span-2 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-[10px] font-black uppercase tracking-widest">État général</p>
                  </div>
                  <p className="text-sm font-medium text-amber-900 italic leading-relaxed">
                    {selectedRecentPatient.general_state || 'Aucun antécédent particulier renseigné.'}
                  </p>
                </div>

                <div className="sm:col-span-2 rounded-2xl border border-gray-100 p-4 bg-slate-50 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Statut actuel</p>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border ${statusClasses[selectedRecentPatient.status_label] || statusClasses.Nouveau}`}>
                    {selectedRecentPatient.status_label || 'Nouveau'}
                  </span>
                </div>
              </div>

              <div className="px-6 py-5 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closePatientModal}
                  className="px-6 py-3 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={continueTreatment}
                  disabled={continuingTreatment}
                  className="px-6 py-3 text-sm font-bold text-white bg-linear-to-r from-blue-600 to-indigo-600 rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                  {continuingTreatment ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Ouverture...
                    </>
                  ) : (
                    <>
                      Continuer le traitement
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
