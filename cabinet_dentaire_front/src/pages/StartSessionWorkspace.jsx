import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  appointmentAPI,
  authAPI,
  dentalActAPI,
  medicalRecordAPI,
  patientTreatmentAPI,
  sessionReceiptAPI,
} from '../services/api';

const StartSessionWorkspace = () => {
  const navigate = useNavigate();
  const { treatmentId } = useParams();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [dentalActs, setDentalActs] = useState([]);
  const [sessionActsSearchTerm, setSessionActsSearchTerm] = useState('');
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

  const [form, setForm] = useState({
    treatment_performed: '',
    next_action: '',
    next_appointment_date: '',
    next_appointment_time: '',
    acts: [],
  });

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
        const [userRes, actsRes, treatmentRes, recordsRes] = await Promise.all([
          authAPI.getUser().catch(() => ({ data: null })),
          dentalActAPI.getAll(),
          patientTreatmentAPI.getById(treatmentId),
          medicalRecordAPI.getAll({ patient_treatment_id: treatmentId }),
        ]);

        setCurrentUser(userRes?.data || null);
        setDentalActs(actsRes?.data?.data || actsRes?.data || []);
        setTreatment(treatmentRes?.data || null);

        const records = recordsRes?.data?.data || recordsRes?.data?.data?.data || [];
        setLastMedicalRecord(records.length > 0 ? records[0] : null);
      } catch (error) {
        console.error('Erreur chargement espace séance:', error);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [treatmentId]);

  const selectedActs = useMemo(() => {
    return form.acts
      .map((selectedAct) => {
        const fullAct = dentalActs.find((a) => Number(a.id) === Number(selectedAct.dental_act_id));
        return fullAct ? { ...selectedAct, dentalAct: fullAct } : null;
      })
      .filter(Boolean);
  }, [form.acts, dentalActs]);

  const selectedActsTotal = useMemo(() => {
    return selectedActs.reduce((sum, item) => {
      return sum + ((Number(item.dentalAct?.tarif || 0)) * (Number(item.quantity || 1)));
    }, 0);
  }, [selectedActs]);

  const handleAddSession = async (e) => {
    e.preventDefault();

    if (!form.treatment_performed) {
      showFeedback('warning', 'Information manquante', 'Veuillez renseigner ce que vous avez fait exactement.');
      return;
    }

    if (!form.next_appointment_date) {
      showFeedback('warning', 'Information manquante', 'Veuillez renseigner la date du prochain rendez-vous.');
      return;
    }

    if (form.acts.length === 0) {
      showFeedback('warning', 'Actes manquants', 'Veuillez sélectionner au moins un acte pour générer automatiquement le reçu de séance.');
      return;
    }

    const currentAppointment = treatment?.nextAppointment || treatment?.next_appointment || null;
    const currentAppointmentDateRaw = currentAppointment?.appointment_date || null;
    const currentAppointmentTimeSpecified = typeof currentAppointment?.appointment_time_specified === 'boolean'
      ? currentAppointment.appointment_time_specified
      : true;
    if (currentAppointmentDateRaw) {
      const currentAppointmentDate = new Date(currentAppointmentDateRaw);
      const now = new Date();
      if (!Number.isNaN(currentAppointmentDate.getTime()) && currentAppointmentDate > now) {
        showFeedback(
          'warning',
          'Séance non autorisée',
          `Vous ne pouvez pas ajouter une séance avant la date du rendez-vous en cours (${formatAppointmentForDisplay(currentAppointmentDateRaw, currentAppointmentTimeSpecified)}).`
        );
        return;
      }
    }

    {
      const now = new Date();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const selectedDateTime = form.next_appointment_time
        ? new Date(`${form.next_appointment_date}T${form.next_appointment_time}`)
        : new Date(`${form.next_appointment_date}T00:00`);

      const isPast = form.next_appointment_time
        ? selectedDateTime < now
        : selectedDateTime < todayStart;

      if (isPast) {
        showFeedback('warning', 'Date invalide', 'Impossible de créer un rendez-vous dans le passé.');
        return;
      }
    }

    setLoading(true);
    try {
      const appointmentDateTime = form.next_appointment_time
        ? `${form.next_appointment_date} ${form.next_appointment_time}:00`
        : form.next_appointment_date;

      const appointmentRes = await appointmentAPI.create({
        patient_id: treatment.patient_id,
        dentist_id: currentUser?.id,
        appointment_date: appointmentDateTime,
        appointment_time_specified: !!form.next_appointment_time,
        duration: null,
        reason: null,
        notes: null,
      });

      const newNextAppointmentId = appointmentRes?.data?.id || null;
      const consumedAppointmentId = treatment.next_appointment_id || null;

      const medicalRecordRes = await medicalRecordAPI.create({
        patient_id: treatment.patient_id,
        patient_treatment_id: treatment.id,
        appointment_id: consumedAppointmentId || newNextAppointmentId,
        treatment_performed: form.treatment_performed,
        next_action: form.next_action,
      });

      await patientTreatmentAPI.update(treatment.id, {
        status: 'in_progress',
        completed_sessions: (treatment.completed_sessions || 0) + 1,
        next_appointment_id: newNextAppointmentId,
      });

      await patientTreatmentAPI.addActs(treatment.id, form.acts);

      const receiptRes = await sessionReceiptAPI.create({
        medical_record_id: medicalRecordRes?.data?.id,
        acts: form.acts,
      });
      const sessionReceiptId = receiptRes?.data?.id || null;

      const successMessage = 'La séance a été ajoutée avec succès. Vous pouvez télécharger le reçu de séance.';

      showFeedback('success', 'Séance enregistrée', successMessage, true, sessionReceiptId);
    } catch (error) {
      console.error('Erreur ajout séance:', error);
      let message = 'Erreur lors de l\'ajout de la séance.';
      if (error.response?.data?.message) {
        message = `${message} ${error.response.data.message}`;
      }
      if (error.response?.data?.errors) {
        message = `${message} ${Object.values(error.response.data.errors).flat().join(' | ')}`;
      }
      showFeedback('error', 'Échec enregistrement', message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Layout>
        <div className="p-6 text-sm text-gray-600">Chargement de l'espace séance...</div>
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
        <div className="rounded-2xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Ajouter une séance</h1>
                <p className="text-xs text-slate-300 mt-0.5">
                  {treatment.patient?.first_name} {treatment.patient?.last_name} - {treatment.name}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
              Étape 2
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Renseigne la séance, puis mets à jour les actes et le prochain rendez-vous.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/treatments')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Retour à la liste
          </button>
        </div>

        {isLocked && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Facture payée: ajout de séance/verrouillage actif.
          </div>
        )}

        <form onSubmit={handleAddSession} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ring-1 ring-slate-100">
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">1. Séance</span>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">2. Actes</span>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">3. Prochain RDV</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3">
            <section className="p-5 border-b lg:border-b-0 lg:border-r border-gray-200 bg-linear-to-b from-blue-50 to-white space-y-3">
              <h2 className="text-sm font-bold text-blue-900">1. Séance réalisée</h2>
              <label className="block text-xs font-semibold text-gray-700">Détail de la séance *</label>
              <textarea
                value={form.treatment_performed}
                onChange={(e) => setForm((prev) => ({ ...prev, treatment_performed: e.target.value }))}
                rows="8"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Décrivez les soins réalisés..."
                required
                disabled={isLocked}
              />
            </section>

            <section className="p-5 border-b lg:border-b-0 lg:border-r border-gray-200 bg-linear-to-b from-amber-50 to-white space-y-3">
              <h2 className="text-sm font-bold text-amber-900">2. Actes réalisés (obligatoire)</h2>
              <input
                type="text"
                value={sessionActsSearchTerm}
                onChange={(e) => setSessionActsSearchTerm(e.target.value)}
                placeholder="Rechercher un acte..."
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                disabled={isLocked}
              />

              <div className="max-h-56 overflow-y-auto space-y-2">
                {sessionActsSearchTerm && dentalActs
                  .filter((act) => {
                    const term = sessionActsSearchTerm.toLowerCase();
                    return act.name?.toLowerCase().includes(term) || act.code?.toLowerCase().includes(term);
                  })
                  .map((act) => {
                    const selected = form.acts.find((a) => Number(a.dental_act_id) === Number(act.id));
                    return (
                      <div key={act.id} className="flex items-center gap-2 p-2 border border-amber-200 rounded-lg bg-white">
                        <input
                          type="checkbox"
                          checked={!!selected}
                          disabled={isLocked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm((prev) => ({
                                ...prev,
                                acts: [...prev.acts, { dental_act_id: act.id, quantity: 1 }],
                              }));
                            } else {
                              setForm((prev) => ({
                                ...prev,
                                acts: prev.acts.filter((a) => Number(a.dental_act_id) !== Number(act.id)),
                              }));
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{act.code ? `${act.code} - ` : ''}{act.name}</p>
                          <p className="text-xs text-gray-500">{Number(act.tarif || 0).toLocaleString()} FCFA</p>
                        </div>
                        {selected && (
                          <input
                            type="number"
                            min="1"
                            value={selected.quantity}
                            disabled={isLocked}
                            onChange={(e) => {
                              const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                              setForm((prev) => ({
                                ...prev,
                                acts: prev.acts.map((a) => (
                                  Number(a.dental_act_id) === Number(act.id) ? { ...a, quantity: qty } : a
                                )),
                              }));
                            }}
                            className="w-14 px-2 py-1 text-xs border border-amber-300 rounded"
                          />
                        )}
                      </div>
                    );
                  })}
              </div>

              {selectedActs.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-100 px-3 py-2 text-xs text-amber-900 font-semibold">
                  {selectedActs.length} acte(s) sélectionné(s) - Total: {selectedActsTotal.toLocaleString()} FCFA
                </div>
              )}
            </section>

            <section className="p-5 bg-linear-to-b from-indigo-50 to-white space-y-3">
              <h2 className="text-sm font-bold text-indigo-900">3. Prochain rendez-vous</h2>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.next_appointment_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, next_appointment_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={isLocked}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Heure (optionnel)</label>
                <input
                  type="time"
                  value={form.next_appointment_time}
                  onChange={(e) => setForm((prev) => ({ ...prev, next_appointment_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={isLocked}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">À prévoir (optionnel)</label>
                <textarea
                  value={form.next_action}
                  onChange={(e) => setForm((prev) => ({ ...prev, next_action: e.target.value }))}
                  rows="5"
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={isLocked}
                />
              </div>
            </section>
          </div>

          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/treatments')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || isLocked || form.acts.length === 0}
              className="px-6 py-2 text-sm font-semibold text-white bg-linear-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer séance'}
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Contexte précédent</h3>
            <span className="text-[11px] text-slate-500">Discret - lecture rapide</span>
          </div>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
            <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
              <p className="font-semibold text-slate-800">Dernier rendez-vous</p>
              {lastAppointment ? (
                <>
                  <p className="mt-1">
                    {formatAppointmentForDisplay(
                      lastAppointment.appointment_date,
                      typeof lastAppointment.appointment_time_specified === 'boolean'
                        ? lastAppointment.appointment_time_specified
                        : true
                    )}
                  </p>
                  {lastAppointment.reason && (
                    <p className="mt-1 text-slate-600">Motif: {lastAppointment.reason}</p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-slate-500">Aucun rendez-vous courant enregistré.</p>
              )}
            </div>

            <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
              <p className="font-semibold text-slate-800">Mémo clinique</p>
              {lastMedicalRecord?.treatment_performed ? (
                <p className="mt-1 whitespace-pre-line">{lastMedicalRecord.treatment_performed}</p>
              ) : treatment?.notes ? (
                <p className="mt-1 whitespace-pre-line">{treatment.notes}</p>
              ) : (
                <p className="mt-1 text-slate-500">Aucune note clinique précédente.</p>
              )}
              {lastMedicalRecord?.next_action && (
                <p className="mt-2 text-slate-600">À prévoir: {lastMedicalRecord.next_action}</p>
              )}
            </div>
          </div>
        </div>

        {feedback.open && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
              <div className={`px-5 py-4 border-b ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200'
                  : feedback.type === 'error'
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-amber-50 border-amber-200'
              }`}>
                <h3 className="text-sm font-bold text-gray-900">{feedback.title}</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700 whitespace-pre-line">{feedback.message}</p>
              </div>
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                {feedback.receiptId && (
                  <button
                    type="button"
                    onClick={downloadSessionReceipt}
                    className="px-4 py-2 mr-2 text-sm font-semibold text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200"
                  >
                    Télécharger le reçu
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeFeedback}
                  className="px-4 py-2 text-sm font-semibold text-white bg-linear-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700"
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
