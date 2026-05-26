import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  appointmentAPI,
  authAPI,
  medicalRecordAPI,
  patientTreatmentAPI,
  sessionReceiptAPI,
} from '../services/api';

const StartSessionWorkspace = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { treatmentId } = useParams();

  const isFinishFlow = !!location.state?.finishTreatment;
  const defaultTreatmentPerformed = location.state?.defaultTreatmentPerformed || '';

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [treatment, setTreatment] = useState(null);
  const [lastMedicalRecord, setLastMedicalRecord] = useState(null);
  const [feedback, setFeedback] = useState({
    open: false,
    type: 'info',
    title: '',
    message: '',
    redirectToTreatments: false,
    receiptId: null,
  });

  const [pastSessions, setPastSessions] = useState([]);
  const [collectedSoFar, setCollectedSoFar] = useState(0);

  const [form, setForm] = useState({
    treatment_performed: defaultTreatmentPerformed, // Initialisation directe
    next_action: '',
    next_appointment_date: '',
    next_appointment_time: '',
    amount_collected: '',
  });

  // Forcer le remplissage si le state arrive
  useEffect(() => {
    if (defaultTreatmentPerformed) {
      setForm(prev => ({
        ...prev,
        treatment_performed: prev.treatment_performed || defaultTreatmentPerformed
      }));
    }
  }, [defaultTreatmentPerformed]);

  const formatAppointmentForDisplay = (rawDate, timeSpecified = true) => {
    if (!rawDate) return 'Non renseignée';
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return 'Non renseignée';

    const isTimeUnspecified = timeSpecified === false;
    if (isTimeUnspecified) {
      return `${parsed.toLocaleDateString('fr-FR')} (heure non précisée)`;
    }

    return parsed.toLocaleString('fr-FR');
  };

  const showFeedback = (type, title, message, redirectToTreatments = false, receiptId = null) => {
    setFeedback({
      open: true,
      type,
      title,
      message,
      redirectToTreatments,
      receiptId,
    });
  };

  const closeFeedback = () => {
    const shouldRedirect = feedback.redirectToTreatments;
    setFeedback((prev) => ({ ...prev, open: false }));
    if (shouldRedirect) {
      navigate('/treatments');
    }
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
      console.error('Erreur generation recu de seance:', error);
      alert('Impossible de générer le reçu de séance.');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [userRes, treatmentRes] = await Promise.all([
          authAPI.getUser().catch(() => ({ data: null })),
          patientTreatmentAPI.getById(treatmentId),
        ]);

        setCurrentUser(userRes?.data || null);
        const treatmentData = treatmentRes?.data || null;
        setTreatment(treatmentData);

        // Récupérer les dossiers médicaux filtrés par traitement ET patient pour plus de sécurité
        const recordsRes = await medicalRecordAPI.getAll({ 
          patient_treatment_id: treatmentId, 
          patient_id: treatmentData?.patient_id, // Ajout de la sécurité par patient_id
          per_page: 100 
        });

        const records = recordsRes?.data?.data || recordsRes?.data?.data?.data || [];
        
        if (records.length > 0) {
          const sortedRecords = records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setPastSessions(sortedRecords);
          setLastMedicalRecord(sortedRecords[0]);
          
          // Calculer le total encaissé directement à partir des séances pour la cohérence
          const sum = records.reduce((s, r) => s + (Number(r.amount_collected || 0)), 0);
          setCollectedSoFar(sum);
        } else {
          setCollectedSoFar(0);
        }
      } catch (error) {
        console.error('Erreur chargement espace séance:', error);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [treatmentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.treatment_performed) {
      showFeedback('warning', 'Information manquante', 'Veuillez renseigner ce que vous avez fait exactement.');
      return;
    }

    setLoading(true);
    try {
      const consumedAppointmentId = treatment.next_appointment_id || null;

      const medicalRecordRes = await medicalRecordAPI.create({
        patient_id: treatment.patient_id,
        patient_treatment_id: treatment.id,
        appointment_id: consumedAppointmentId,
        treatment_performed: form.treatment_performed,
        next_action: form.next_action,
        amount_collected: form.amount_collected ? Number(form.amount_collected) : null,
      });

      let newNextAppointmentId = null;
      if (form.next_appointment_date) {
        const appointmentDateTime = form.next_appointment_time
          ? `${form.next_appointment_date}T${form.next_appointment_time}:00`
          : form.next_appointment_date;

        const nextRes = await appointmentAPI.create({
          patient_id: treatment.patient_id,
          dentist_id: currentUser?.id,
          appointment_date: appointmentDateTime,
          appointment_time_specified: !!form.next_appointment_time,
          duration: null,
          reason: form.next_action || null,
          notes: null,
        });

        newNextAppointmentId = nextRes?.data?.id || null;
      }

      await patientTreatmentAPI.update(treatment.id, {
        status: isFinishFlow ? 'completed' : 'in_progress',
        completed_sessions: (treatment.completed_sessions || 0) + 1,
        next_appointment_id: isFinishFlow ? null : newNextAppointmentId,
      });

      let sessionReceiptId = null;
      if (medicalRecordRes?.data?.id) {
        try {
          const receiptLookup = await sessionReceiptAPI.getAll({
            medical_record_id: medicalRecordRes.data.id,
            per_page: 1,
          });
          const firstReceipt = receiptLookup?.data?.data?.[0] || receiptLookup?.data?.[0] || null;
          sessionReceiptId = firstReceipt?.id || null;
        } catch (lookupError) {
          console.error('Impossible de récupérer le reçu créé automatiquement:', lookupError);
        }
      }

      const successMessage = isFinishFlow 
        ? 'Le traitement a été clôturé avec succès. Toutes les données sont enregistrées.'
        : (sessionReceiptId ? 'La séance a été enregistrée. Votre reçu est prêt.' : 'La séance a été enregistrée avec succès.');

      showFeedback('success', isFinishFlow ? 'Traitement clôturé' : 'Séance enregistrée', successMessage, true, sessionReceiptId);
    } catch (error) {
      console.error('Erreur ajout séance:', error);
      let message = 'Erreur lors de l\'ajout de la séance.';
      if (error.response?.data?.message) {
        message = `${message} ${error.response.data.message}`;
      }
      showFeedback('error', 'Échec enregistrement', message);
    } finally {
      setLoading(false);
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

  if (loadingData) {
    return (
      <Layout>
        <div className="p-6 text-sm text-gray-600 font-medium">Chargement de l'espace séance...</div>
      </Layout>
    );
  }

  if (!treatment) {
    return (
      <Layout>
        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-700">Traitement introuvable.</p>
          <button
            type="button"
            onClick={() => navigate('/treatments')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Retour à la liste
          </button>
        </div>
      </Layout>
    );
  }

  const isLocked = !!treatment.is_invoice_paid_locked;
  const lastAppointment = treatment?.nextAppointment || treatment?.next_appointment || null;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="rounded-2xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 shadow-lg border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  {isFinishFlow ? 'Finaliser le traitement' : 'Ajouter une séance'}
                  {treatment.patient?.date_of_birth && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">
                      {calculateAge(treatment.patient.date_of_birth)} ans
                    </span>
                  )}
                </h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-xs text-slate-300 font-medium">
                    {treatment.patient?.first_name} {treatment.patient?.last_name} — {treatment.name}
                  </p>
                  {treatment.patient?.general_state && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] font-bold text-amber-500 animate-pulse">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                      {treatment.patient.general_state}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ${
              isFinishFlow ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
            }`}>
              {isFinishFlow ? 'CLÔTURE DE DOSSIER' : 'SÉANCE MÉDICALE'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium italic">
              {isFinishFlow 
                ? 'Dernière séance : enregistrez les soins finaux et le dernier paiement pour clôturer le diagnostic.'
                : 'Décrivez les soins prodigués aujourd\'hui et planifiez la suite.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/treatments')}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
          >
            Retour à la liste
          </button>
        </div>

        {isLocked && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-3 shadow-xs">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Attention : La facture est déjà payée. L'ajout de nouvelles séances est verrouillé.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden ring-1 ring-slate-100">
          <div className="px-5 py-3 border-b border-gray-200 bg-slate-50 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-[10px] text-white font-bold">1</span>
              <span className="text-[11px] font-bold uppercase text-slate-600 tracking-tighter">Traitement</span>
            </div>
            <div className="w-8 border-t border-slate-300"></div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-[10px] text-white font-bold">2</span>
              <span className="text-[11px] font-bold uppercase text-slate-600 tracking-tighter">Paiement</span>
            </div>
            {!isFinishFlow && (
              <>
                <div className="w-8 border-t border-slate-300"></div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-[10px] text-white font-bold">3</span>
                  <span className="text-[11px] font-bold uppercase text-slate-600 tracking-tighter">Prochain RDV</span>
                </div>
              </>
            )}
          </div>

          <div className={`grid grid-cols-1 divide-y lg:divide-y-0 divide-gray-200 ${isFinishFlow ? '' : 'lg:grid-cols-2 lg:divide-x'}`}>
            {/* Colonne 1: Traitement et Paiement */}
            <div className="p-6 space-y-6">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h2 className="text-base font-bold">Soins prodigués</h2>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Description du traitement *</label>
                  <textarea
                    value={form.treatment_performed}
                    onChange={(e) => setForm((prev) => ({ ...prev, treatment_performed: e.target.value }))}
                    rows="5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    placeholder="Quels soins ont été réalisés aujourd'hui ?"
                    required
                    disabled={isLocked}
                  />
                </div>
              </section>

              <section className="space-y-4 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 text-emerald-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h2 className="text-base font-bold">Règlement</h2>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">Montant encaissé (XOF)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.amount_collected}
                      onChange={(e) => setForm((prev) => ({ ...prev, amount_collected: e.target.value }))}
                      className="w-full pl-4 pr-12 py-3 border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-lg font-bold text-emerald-900 bg-white"
                      placeholder="0.00"
                      disabled={isLocked}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">XOF</span>
                  </div>
                  {collectedSoFar > 0 && (
                    <p className="mt-3 text-xs font-semibold text-emerald-700 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                      </svg>
                      Déjà réglé : {collectedSoFar.toLocaleString('fr-FR')} XOF
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Colonne 2: Prochain Rendez-vous - Cache si flow de clôture */}
            {!isFinishFlow && (
              <div className="p-6 bg-slate-50/50 space-y-6">
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h2 className="text-base font-bold">Planification suite</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Date du prochain RDV *</label>
                      <input
                        type="date"
                        value={form.next_appointment_date}
                        onChange={(e) => setForm((prev) => ({ ...prev, next_appointment_date: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm bg-white"
                        required
                        disabled={isLocked}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Heure (si connue)</label>
                      <input
                        type="time"
                        value={form.next_appointment_time}
                        onChange={(e) => setForm((prev) => ({ ...prev, next_appointment_time: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm bg-white"
                        disabled={isLocked}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">À prévoir pour la suite</label>
                    <textarea
                      value={form.next_action}
                      onChange={(e) => setForm((prev) => ({ ...prev, next_action: e.target.value }))}
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm bg-white"
                      placeholder="Quels soins prévoyez-vous pour la prochaine fois ?"
                      disabled={isLocked}
                    />
                  </div>
                </section>

                {/* Contexte précédent pour aider le dentiste */}
                <div className="pt-6 mt-6 border-t border-slate-200">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Rappel historique</h3>
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dernière séance</p>
                      {lastMedicalRecord?.treatment_performed ? (
                        <p className="text-xs text-slate-700 line-clamp-3 italic">"{lastMedicalRecord.treatment_performed}"</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Aucun historique disponible.</p>
                      )}
                    </div>
                    {lastMedicalRecord?.next_action && (
                      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 shadow-sm">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Prévu pour aujourd'hui</p>
                        <p className="text-xs text-indigo-800 font-medium italic">"{lastMedicalRecord.next_action}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
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
                disabled={loading || isLocked}
                className={`px-8 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isFinishFlow 
                    ? 'bg-linear-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 shadow-amber-200' 
                    : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  isFinishFlow ? 'Clôturer le traitement' : 'Terminer la séance'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Historique financier */}
        {pastSessions.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Historique des encaissements</h3>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                {pastSessions.length} Séances
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-3 text-left">Séance</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-right">Montant encaissé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pastSessions.map((session, idx) => (
                    <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-slate-700">Séance #{pastSessions.length - idx}</td>
                      <td className="px-6 py-3 text-slate-600">
                        {new Date(session.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-slate-900">
                        {session.amount_collected ? `${Number(session.amount_collected).toLocaleString('fr-FR')} XOF` : '–'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/80">
                    <td colSpan="2" className="px-6 py-4 text-right font-bold text-slate-500 uppercase tracking-widest text-[11px]">Total encaissé :</td>
                    <td className="px-6 py-4 text-right font-extrabold text-blue-700 text-lg">
                      {collectedSoFar.toLocaleString('fr-FR')} XOF
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Feedback Modal */}
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
                    Télécharger le reçu de séance
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

export default StartSessionWorkspace;
