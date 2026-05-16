import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { patientAPI, patientTreatmentAPI, medicalRecordAPI, sessionReceiptAPI, authAPI } from '../services/api';

const StartTreatmentWorkspace = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patientTreatments, setPatientTreatments] = useState([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  const [patientHistory, setPatientHistory] = useState([]);
  const [pastTreatments, setPastTreatments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAutoCloseModal, setShowAutoCloseModal] = useState(false);

  useEffect(() => {
    // Recherche serveur debouncée
    const delayDebounceFn = setTimeout(() => {
      if (patientSearchTerm && showPatientList) {
        searchPatients(patientSearchTerm);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [patientSearchTerm]);

  const searchPatients = async (term) => {
    try {
      const res = await patientAPI.search(term);
      setPatients(res.data?.data || []);
    } catch (error) {
      console.error('Erreur recherche patients:', error);
    }
  };

  const [form, setForm] = useState({
    patient_id: '',
    name: '', // Nom du traitement
    planned_treatment: '', // Champ libre pour le traitement
    amount_collected: '', // Premier encaissement
    start_date: new Date().toISOString().split('T')[0],
    next_appointment_date: '',
    next_appointment_reason: '',
  });

  const [feedback, setFeedback] = useState({
    open: false,
    type: 'info',
    title: '',
    message: '',
    redirectToTreatments: false,
    receiptId: null,
  });

  const showFeedback = (type, title, message, redirectToTreatments = false, receiptId = null) => {
    setFeedback({ open: true, type, title, message, redirectToTreatments, receiptId });
  };

  const closeFeedback = () => {
    const shouldRedirect = feedback.redirectToTreatments;
    setFeedback((prev) => ({ ...prev, open: false }));
    if (shouldRedirect) navigate('/treatments');
  };

  const downloadSessionReceipt = async () => {
    if (!feedback.receiptId) return;
    try {
      const res = await sessionReceiptAPI.generate(feedback.receiptId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recu_seance_${feedback.receiptId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur generation recu initial:', error);
      alert('Impossible de générer le reçu de séance.');
    }
  };

  useEffect(() => {
    const loadPatientHistory = async () => {
      if (!form.patient_id) {
        setPatientHistory([]);
        setPastTreatments([]);
        return;
      }

      setLoadingHistory(true);
      try {
        const [recordsRes, treatmentsRes] = await Promise.all([
          medicalRecordAPI.getAll({
            patient_id: form.patient_id,
            per_page: 5,
          }),
          patientTreatmentAPI.getAll({
            patient_id: form.patient_id,
            per_page: 5,
          })
        ]);

        const historyData = recordsRes.data?.data || recordsRes.data?.data?.data || [];
        const treatsData = (treatmentsRes.data?.data || treatmentsRes.data || []).filter(t => t.status === 'completed');
        
        setPatientHistory(historyData);
        setPastTreatments(treatsData);
      } catch (error) {
        console.error('Erreur chargement historique patient:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadPatientHistory();
  }, [form.patient_id]);

  useEffect(() => {
    const preload = async () => {
      setLoadingData(true);
      try {
        const [userRes, patientsRes, treatmentsRes] = await Promise.all([
          authAPI.getUser().catch(() => ({ data: null })),
          patientAPI.getAll(),
          patientTreatmentAPI.getAll(),
        ]);

        setCurrentUser(userRes?.data || null);
        const patientsData = patientsRes.data?.data || patientsRes.data || [];
        const treatmentsData = treatmentsRes.data?.data || treatmentsRes.data || [];

        setPatients(patientsData);
        setPatientTreatments(treatmentsData);

        const preselectedPatientId = Number(location.state?.patientId || 0);
        if (preselectedPatientId) {
          let patient = patientsData.find((p) => Number(p.id) === preselectedPatientId);

          if (!patient) {
            try {
              const patientByIdRes = await patientAPI.getById(preselectedPatientId);
              patient = patientByIdRes?.data || null;
              if (patient?.id) {
                setPatients((prev) => [patient, ...prev]);
              }
            } catch (e) {
              console.error('Patient introuvable:', e);
            }
          }

          if (patient?.id) {
            setForm((prev) => ({ ...prev, patient_id: patient.id }));
            setPatientSearchTerm(`${patient.first_name || ''} ${patient.last_name || ''}`.trim());
          }
        }
      } catch (error) {
        console.error('Erreur chargement espace suivi:', error);
      } finally {
        setLoadingData(false);
      }
    };

    preload();
  }, [location.state]);

  const filteredPatients = useMemo(() => {
    const term = patientSearchTerm.toLowerCase();
    return patients.filter((p) => {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      return fullName.includes(term) || (p.phone && p.phone.includes(patientSearchTerm));
    });
  }, [patients, patientSearchTerm]);

  const activePatientTreatment = useMemo(() => {
    if (!form.patient_id) return null;
    return patientTreatments.find(
      (pt) => Number(pt.patient_id) === Number(form.patient_id) && ['planned', 'in_progress'].includes(pt.status)
    ) || null;
  }, [patientTreatments, form.patient_id]);

  const saveNewTreatment = async () => {
    setLoading(true);
    try {
      const res = await patientTreatmentAPI.create({ 
        patient_id: form.patient_id,
        name: form.name,
        start_date: form.start_date,
        next_appointment_date: form.next_appointment_date,
        next_appointment_reason: form.next_appointment_reason,
        notes: form.planned_treatment,
        acts: [] 
      });
      
      const createdTreatment = res?.data || null;

      if (!createdTreatment?.id) {
        throw new Error('Erreur lors de la création du traitement.');
      }

      let sessionReceiptId = null;
      let appointmentId = Number(createdTreatment.next_appointment_id || 0) || null;

      const mrRes = await medicalRecordAPI.create({
        patient_id: createdTreatment.patient_id,
        patient_treatment_id: createdTreatment.id,
        appointment_id: appointmentId,
        treatment_performed: 'Initialisation du diagnostic : ' + form.planned_treatment,
        amount_collected: form.amount_collected ? Number(form.amount_collected) : null,
      });

      const medicalRecord = mrRes?.data || null;

      if (medicalRecord?.id && form.amount_collected && Number(form.amount_collected) > 0) {
        const receiptRes = await sessionReceiptAPI.create({
          medical_record_id: medicalRecord.id,
          amount_collected: Number(form.amount_collected),
        });
        sessionReceiptId = receiptRes?.data?.id || null;
      }

      const successMsg = sessionReceiptId 
        ? 'Le diagnostic a été créé et le reçu est prêt.' 
        : 'Le diagnostic a été créé avec succès.';
        
      showFeedback('success', 'Diagnostic démarré', successMsg, true, sessionReceiptId);
    } catch (error) {
      console.error('Erreur démarrage diagnostic:', error);
      const message = error.response?.data?.message || 'Erreur lors du démarrage du diagnostic.';
      showFeedback('error', 'Échec', message);
    } finally {
      setLoading(false);
      setShowAutoCloseModal(false);
    }
  };

  const handleConfirmWithAutoClose = async () => {
    setLoading(true);
    try {
      if (activePatientTreatment) {
        await patientTreatmentAPI.update(activePatientTreatment.id, { status: 'completed' });
      }
      await saveNewTreatment();
    } catch (error) {
      console.error('Erreur lors de la clôture automatique:', error);
      showFeedback('error', 'Erreur', 'Impossible de clôturer l\'ancien traitement.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient_id || !form.name || !form.planned_treatment || !form.next_appointment_date) {
      showFeedback('warning', 'Champs obligatoires', 'Veuillez remplir les informations du patient, le diagnostic, le traitement prévu et le prochain RDV.');
      return;
    }

    if (activePatientTreatment) {
      setShowAutoCloseModal(true);
    } else {
      await saveNewTreatment();
    }
  };

  if (loadingData) {
    return (
      <Layout>
        <div className="p-6 text-sm text-gray-600 font-medium">Chargement de l'espace diagnostic...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {showAutoCloseModal && (
          <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-100 animate-in fade-in zoom-in duration-200">
              <div className="bg-amber-50 px-6 py-6 text-center">
                <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Traitement actif détecté</h3>
                <p className="mt-2 text-sm text-slate-600 font-medium px-4">
                  Le patient a déjà un traitement en cours : <span className="text-amber-700 font-bold">"{activePatientTreatment?.name}"</span>. 
                  Démarrer ce nouveau diagnostic marquera l'ancien comme <span className="font-bold uppercase text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">Terminé</span>.
                </p>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={handleConfirmWithAutoClose}
                  disabled={loading}
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
                >
                  {loading ? 'Traitement en cours...' : 'Oui, clôturer et démarrer'}
                </button>
                <button
                  onClick={() => setShowAutoCloseModal(false)}
                  disabled={loading}
                  className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 shadow-lg border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Nouveau diagnostic patient</h1>
                <p className="text-xs text-slate-300 mt-0.5 font-medium">Initialisez le dossier de soins et planifiez la première étape.</p>
              </div>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              INITIALISATION
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 font-medium italic">Configurez le plan de traitement global du patient.</p>
          <button
            type="button"
            onClick={() => navigate('/treatments')}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
          >
            Retour à la liste
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden ring-1 ring-slate-100">
          <div className="px-5 py-3 border-b border-gray-200 bg-slate-50 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-[10px] text-white font-bold">1</span>
              <span className="text-[11px] font-bold uppercase text-slate-600 tracking-tighter">Patient</span>
            </div>
            <div className="w-8 border-t border-slate-300"></div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-[10px] text-white font-bold">2</span>
              <span className="text-[11px] font-bold uppercase text-slate-600 tracking-tighter">Plan de traitement</span>
            </div>
            <div className="w-8 border-t border-slate-300"></div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-[10px] text-white font-bold">3</span>
              <span className="text-[11px] font-bold uppercase text-slate-600 tracking-tighter">Premier RDV</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            <div className="p-6 space-y-4 bg-slate-50/30">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                1. Identification
              </h2>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Patient *</label>
                <input
                  type="text"
                  value={patientSearchTerm}
                  onChange={(e) => {
                    setPatientSearchTerm(e.target.value);
                    setShowPatientList(true);
                  }}
                  onFocus={() => setShowPatientList(true)}
                  placeholder="Rechercher un patient..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                />

                {showPatientList && patientSearchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-20">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, patient_id: p.id }));
                            setPatientSearchTerm(`${p.first_name || ''} ${p.last_name || ''}`.trim());
                            setShowPatientList(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <p className="font-bold text-slate-900">{p.first_name} {p.last_name}</p>
                          {p.phone && <p className="text-xs text-slate-500 mt-0.5">{p.phone}</p>}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 italic">Aucun patient trouvé</div>
                    )}
                  </div>
                )}
              </div>

              {activePatientTreatment && (
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800 font-medium flex gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  Ce patient a déjà un diagnostic actif : "{activePatientTreatment.name}"
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nom du diagnostic *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  placeholder="Ex: Prothèse dentaire complète"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date de début</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white font-medium"
                />
              </div>

              {form.patient_id && (
                <div className="pt-4 mt-4 border-t border-slate-200">
                  <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Historique des soins récents
                  </h3>
                  
                  {loadingHistory ? (
                    <div className="space-y-2 animate-pulse">
                      {[1, 2].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg"></div>)}
                    </div>
                  ) : (patientHistory.length > 0 || pastTreatments.length > 0) ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {pastTreatments.length > 0 && (
                        <div className="mb-4 pb-4 border-b border-slate-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Derniers Diagnostics terminés</p>
                          <div className="flex flex-wrap gap-2">
                            {pastTreatments.map(t => (
                              <div key={t.id} className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-600">
                                {t.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {patientHistory.length > 0 && (
                        <>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Séances récentes</p>
                          {patientHistory.map((record) => (
                            <div key={record.id} className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
                              <div className="flex justify-between items-start mb-1.5">
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                  {new Date(record.created_at).toLocaleDateString('fr-FR')}
                                </span>
                                {record.amount_collected > 0 && (
                                  <span className="text-[10px] font-extrabold text-emerald-600">
                                    {Number(record.amount_collected).toLocaleString('fr-FR')} XOF
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-bold text-slate-800 line-clamp-1 mb-0.5">
                                {record.patient_treatment?.name || 'Consultation'}
                              </p>
                              <p className="text-[10px] text-slate-500 italic line-clamp-2 leading-relaxed">
                                "{record.treatment_performed}"
                              </p>
                              {record.next_action && (
                                <div className="mt-1.5 pt-1.5 border-t border-blue-50 flex items-start gap-1">
                                  <span className="text-[9px] font-bold text-blue-400 uppercase">Diagnostic :</span>
                                  <p className="text-[9px] text-blue-600 font-medium line-clamp-1">{record.next_action}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">
                      Aucun antécédent enregistré pour ce patient.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                2. Plan de soins
              </h2>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Description du traitement prévu *</label>
                <textarea
                  value={form.planned_treatment}
                  onChange={(e) => setForm((prev) => ({ ...prev, planned_treatment: e.target.value }))}
                  rows="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                  placeholder="Détaillez les actes prévus pour ce patient..."
                  required
                />
              </div>

              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">Premier encaissement (XOF)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount_collected}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount_collected: e.target.value }))}
                    className="w-full pl-4 pr-12 py-3 border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-lg font-bold text-emerald-900 bg-white"
                    placeholder="0.00"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">XOF</span>
                </div>
                <p className="mt-2 text-[10px] text-emerald-600 font-medium">L'encaissement générera automatiquement un reçu de séance.</p>
              </div>
            </div>

            <div className="p-6 space-y-4 bg-slate-50/30">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                3. Planification
              </h2>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date du 1er RDV (Optionnel)</label>
                <input
                  type="date"
                  value={form.next_appointment_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, next_appointment_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Note de planification (optionnel)</label>
                <textarea
                  rows="4"
                  value={form.next_appointment_reason}
                  onChange={(e) => setForm((prev) => ({ ...prev, next_appointment_reason: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                  placeholder="Objectif de la première séance..."
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-5 bg-slate-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">
              * Champs obligatoires
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/treatments')}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-2.5 text-sm font-bold text-white bg-linear-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Démarrage...
                  </>
                ) : (
                  'Démarrer le Diagnostic'
                )}
              </button>
            </div>
          </div>
        </form>

        {feedback.open && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className={`px-6 py-8 text-center ${
                feedback.type === 'success' ? 'bg-emerald-50' : feedback.type === 'error' ? 'bg-rose-50' : 'bg-amber-50'
              }`}>
                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
                  feedback.type === 'success' ? 'bg-emerald-500 text-white' : feedback.type === 'error' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {feedback.type === 'success' ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{feedback.title}</h3>
                <p className="mt-2 text-sm text-slate-600 font-medium px-4">{feedback.message}</p>
              </div>
              <div className="p-6 bg-white flex flex-col gap-2">
                {feedback.receiptId && (
                  <button
                    type="button"
                    onClick={downloadSessionReceipt}
                    className="w-full py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Télécharger le reçu initial
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeFeedback}
                  className="w-full py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                >
                  {feedback.redirectToTreatments ? 'Retour à la liste' : 'Fermer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StartTreatmentWorkspace;