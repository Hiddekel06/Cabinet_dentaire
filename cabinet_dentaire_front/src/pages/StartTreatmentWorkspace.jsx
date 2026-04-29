import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { dentalActAPI, patientAPI, patientTreatmentAPI, medicalRecordAPI, sessionReceiptAPI } from '../services/api';

const StartTreatmentWorkspace = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [patientTreatments, setPatientTreatments] = useState([]);
  const [dentalActs, setDentalActs] = useState([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  const [dentalActsSearchTerm, setDentalActsSearchTerm] = useState('');
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [actPrices, setActPrices] = useState({});

  const [form, setForm] = useState({
    patient_id: '',
    name: '',
    acts: [],
    start_date: new Date().toISOString().split('T')[0],
    next_appointment_date: '',
    next_appointment_reason: '',
    notes: '',
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
    const preload = async () => {
      setLoading(true);
      try {
        const [patientsRes, treatmentsRes, actsRes] = await Promise.all([
          patientAPI.getAll(),
          patientTreatmentAPI.getAll(),
          dentalActAPI.getAll(),
        ]);

        const patientsData = patientsRes.data?.data || patientsRes.data || [];
        const treatmentsData = treatmentsRes.data?.data || treatmentsRes.data || [];
        const actsData = actsRes.data?.data || actsRes.data || [];

        setPatients(patientsData);
        setPatientTreatments(treatmentsData);
        setDentalActs(actsData);

        const preselectedPatientId = Number(location.state?.patientId || 0);
        if (preselectedPatientId) {
          let patient = patientsData.find((p) => Number(p.id) === preselectedPatientId);

          // Fallback: la liste peut etre paginee et ne pas contenir le patient fraichement cree.
          if (!patient) {
            try {
              const patientByIdRes = await patientAPI.getById(preselectedPatientId);
              patient = patientByIdRes?.data || null;

              if (patient?.id) {
                setPatients((prev) => {
                  if (prev.some((p) => Number(p.id) === Number(patient.id))) {
                    return prev;
                  }
                  return [patient, ...prev];
                });
              }
            } catch (fetchError) {
              console.error('Impossible de charger le patient preselectionne:', fetchError);
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
        setLoading(false);
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

  const totalActs = useMemo(() => {
    return form.acts.reduce((sum, selectedAct) => {
      const act = dentalActs.find((item) => Number(item.id) === Number(selectedAct.dental_act_id));
      return sum + ((act?.tarif || 0) * (selectedAct.quantity || 1));
    }, 0);
  }, [form.acts, dentalActs]);

  const totalActsWithCustomPrices = useMemo(() => {
    return form.acts.reduce((sum, selectedAct) => {
      const act = dentalActs.find((item) => Number(item.id) === Number(selectedAct.dental_act_id));
      const price = Number(actPrices[selectedAct.dental_act_id] ?? act?.tarif ?? 0);
      return sum + (price * (selectedAct.quantity || 1));
    }, 0);
  }, [form.acts, dentalActs, actPrices]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient_id || !form.name || !form.next_appointment_date) {
      alert('Veuillez remplir les champs obligatoires.');
      return;
    }

    // Initialize prices if not already set
    const initialPrices = {};
    form.acts.forEach((selectedAct) => {
      if (!actPrices[selectedAct.dental_act_id]) {
        const act = dentalActs.find((item) => Number(item.id) === Number(selectedAct.dental_act_id));
        initialPrices[selectedAct.dental_act_id] = String(act?.tarif || 0);
      }
    });
    if (Object.keys(initialPrices).length > 0) {
      setActPrices((prev) => ({ ...prev, ...initialPrices }));
    }

    // Show pricing modal
    setShowPricingModal(true);
  };

  const confirmTreatment = async () => {
    setLoading(true);
    try {
      // Include custom prices in the acts payload
      const actsWithPrices = form.acts.map((a) => ({
        ...a,
        unit_price: Number(actPrices[a.dental_act_id] ?? 0),
      }));

      const res = await patientTreatmentAPI.create({ ...form, acts: actsWithPrices });
      const created = res?.data || null;

      // Create a minimal medical record for this initial session so we can generate a session receipt
      let sessionReceiptId = null;
      let receiptResRef = null;
      try {
        if (created?.id) {
          let appointmentId = Number(
            created?.next_appointment_id
            ?? created?.nextAppointment?.id
            ?? created?.next_appointment?.id
            ?? 0
          ) || null;

          if (!appointmentId) {
            try {
              const treatmentRefreshRes = await patientTreatmentAPI.getById(created.id);
              const treatmentRefresh = treatmentRefreshRes?.data || {};
              appointmentId = Number(
                treatmentRefresh?.next_appointment_id
                ?? treatmentRefresh?.nextAppointment?.id
                ?? treatmentRefresh?.next_appointment?.id
                ?? 0
              ) || null;
            } catch (appointmentLookupErr) {
              console.error('Erreur récupération appointment_id initial:', appointmentLookupErr);
            }
          }

          if (!appointmentId) {
            receiptResRef = {
              error: 'Rendez-vous initial introuvable pour créer le reçu.',
            };
            throw new Error('INITIAL_APPOINTMENT_NOT_FOUND');
          }

          const mrRes = await medicalRecordAPI.create({
            patient_id: created.patient_id,
            // Keep null here to bypass "future next appointment" lock that is intended for later sessions.
            patient_treatment_id: null,
            appointment_id: appointmentId,
            treatment_performed: 'Démarrage du suivi',
            next_action: form.notes || null,
          });

          const medicalRecord = mrRes?.data || null;
          if (medicalRecord?.id) {
            let receiptActsPayload = (actsWithPrices || []).map((item) => ({
              dental_act_id: Number(item.dental_act_id),
              quantity: Math.max(1, Number(item.quantity) || 1),
              unit_price: Number(item.unit_price ?? 0),
            }));

            // Fallback: if no acts were selected in form, try to read acts from created treatment (includes defaults).
            if (receiptActsPayload.length === 0 && created?.id) {
              try {
                const treatmentRes = await patientTreatmentAPI.getById(created.id);
                const treatmentData = treatmentRes?.data || {};
                const serverActs =
                  treatmentData?.acts
                  || treatmentData?.patient_treatment_acts
                  || treatmentData?.dental_acts
                  || [];

                const mappedActs = (Array.isArray(serverActs) ? serverActs : []).map((item) => {
                  const dentalActId = Number(
                    item?.dental_act_id
                    ?? item?.dentalAct?.id
                    ?? item?.dental_act?.id
                    ?? item?.id
                    ?? 0
                  );
                  const quantity = Math.max(1, Number(item?.quantity) || 1);
                  const unitPrice = Number(
                    item?.unit_price
                    ?? item?.tarif_snapshot
                    ?? item?.dentalAct?.tarif
                    ?? item?.dental_act?.tarif
                    ?? item?.tarif
                    ?? 0
                  );

                  return {
                    dental_act_id: dentalActId,
                    quantity,
                    unit_price: unitPrice,
                  };
                }).filter((act) => act.dental_act_id > 0);

                // Ensure unique dental acts if API already contains duplicates.
                const uniqueByAct = new Map();
                mappedActs.forEach((act) => {
                  if (!uniqueByAct.has(act.dental_act_id)) {
                    uniqueByAct.set(act.dental_act_id, act);
                  }
                });
                receiptActsPayload = Array.from(uniqueByAct.values());
              } catch (fallbackErr) {
                console.error('Erreur fallback actes recu initial:', fallbackErr);
              }
            }

            let receiptRes = null;
            let receiptErrorMessage = null;
            try {
              receiptRes = await sessionReceiptAPI.create({
                medical_record_id: medicalRecord.id,
                acts: receiptActsPayload,
              });
            } catch (rErr) {
              console.error('Erreur creation receipt API:', rErr);
              console.error('Receipt error response data:', rErr.response?.data ?? rErr);
              if (rErr.response?.data?.errors) {
                receiptErrorMessage = Object.values(rErr.response.data.errors).flat().join(' | ');
              } else if (rErr.response?.data?.message) {
                receiptErrorMessage = rErr.response.data.message;
              } else {
                receiptErrorMessage = rErr.message || String(rErr);
              }
            }

            // Be robust: some APIs return { id } or { data: { id } }
            sessionReceiptId = receiptRes?.data?.id ?? receiptRes?.data?.data?.id ?? null;
            // store raw response for debug if needed
            receiptResRef = receiptRes ?? null;
            // attach error message to ref for later user feedback
            if (!sessionReceiptId && receiptErrorMessage) {
              receiptResRef = { error: receiptErrorMessage };
            }
          }
        }
      } catch (innerErr) {
        console.error('Erreur création reçu initial:', innerErr);
      }

      const successMsg = 'Votre suivi a été créé.' + (sessionReceiptId ? ' Le reçu est prêt et téléchargeable.' : '');
      setShowPricingModal(false);
      if (sessionReceiptId) {
        showFeedback('success', 'Reçu prêt', successMsg, true, sessionReceiptId);
      } else if (receiptResRef?.error) {
        showFeedback('warning', 'Suivi créé (reçu non généré)', `Le suivi a été créé, mais le reçu n'a pas pu être généré: ${receiptResRef.error}`, true, null);
      } else {
        showFeedback('success', 'Suivi démarré', 'Suivi démarré avec succès.', true, null);
      }
    } catch (error) {
      console.error('Erreur démarrage suivi:', error);
      if (error.response?.data?.error === 'PATIENT_HAS_ACTIVE_TREATMENT') {
        const existing = error.response.data.existing_treatment;
        alert(
          `Ce patient a déjà un suivi actif:\n\n` +
          `${existing.name} (${existing.status === 'planned' ? 'Planifié' : 'En cours'})\n` +
          `Démarré le ${new Date(existing.start_date).toLocaleDateString('fr-FR')}`
        );
      } else {
        alert(error.response?.data?.message || 'Erreur lors du démarrage du suivi.');
      }
    } finally {
      setLoading(false);
    }
  };

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
                <h1 className="text-xl font-bold text-white">Nouveau suivi patient</h1>
                <p className="text-xs text-slate-300 mt-0.5">Workspace traitement - saisie guidée en 3 sections</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
              Étape 1
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Configure le traitement puis planifie le premier rendez-vous.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/treatments')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Retour à la liste
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ring-1 ring-slate-100">
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">1. Patient</span>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">2. Actes</span>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">3. Prochain RDV</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3">
            <section className="p-5 border-b lg:border-b-0 lg:border-r border-gray-200 bg-linear-to-b from-blue-50 to-white space-y-4">
              <h2 className="text-sm font-bold text-blue-900">1. Patient et suivi</h2>

              <div className="relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Patient <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={patientSearchTerm}
                  onChange={(e) => {
                    setPatientSearchTerm(e.target.value);
                    setShowPatientList(true);
                  }}
                  onFocus={() => setShowPatientList(true)}
                  placeholder="Rechercher un patient..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />

                {showPatientList && patientSearchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-20">
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
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="font-medium text-gray-900">{p.first_name} {p.last_name}</p>
                          {p.phone && <p className="text-xs text-gray-500">{p.phone}</p>}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">Aucun patient trouvé</div>
                    )}
                  </div>
                )}
              </div>

              {activePatientTreatment && (
                <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-xs text-amber-800">
                  Ce patient a déjà un suivi actif: <span className="font-semibold">{activePatientTreatment.name}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nom du suivi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Dévitalisation dent 36"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date de début</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </section>

            <section className="p-5 border-b lg:border-b-0 lg:border-r border-gray-200 bg-linear-to-b from-amber-50 to-white space-y-4">
              <h2 className="text-sm font-bold text-amber-900">2. Actes optionnels</h2>
              <p className="text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded-lg px-2 py-1">
                Consultation simple est ajoutée automatiquement.
              </p>

              <input
                type="text"
                value={dentalActsSearchTerm}
                onChange={(e) => setDentalActsSearchTerm(e.target.value)}
                placeholder="Rechercher un acte..."
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />

              <div className="max-h-64 overflow-y-auto space-y-2">
                {dentalActsSearchTerm && dentalActs
                  .filter((act) => {
                    const term = dentalActsSearchTerm.toLowerCase();
                    return (
                      act.name?.toLowerCase().includes(term)
                      || act.code?.toLowerCase().includes(term)
                      || act.description?.toLowerCase().includes(term)
                    );
                  })
                  .map((act) => {
                    const selected = form.acts.find((a) => Number(a.dental_act_id) === Number(act.id));
                    return (
                      <div key={act.id} className="flex items-center gap-2 p-2 rounded-lg border border-amber-200 bg-white">
                        <input
                          type="checkbox"
                          checked={!!selected}
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
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {act.code ? `${act.code} - ` : ''}{act.name}
                          </p>
                          <p className="text-xs text-gray-500">{Number(act.tarif || 0).toLocaleString()} FCFA</p>
                        </div>
                        {selected && (
                          <input
                            type="number"
                            min="1"
                            value={selected.quantity}
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

              {form.acts.length > 0 && (
                <div className="text-xs font-semibold text-amber-900 bg-amber-100 border border-amber-200 rounded-lg px-3 py-2">
                  Total estimé: {totalActs.toLocaleString()} FCFA
                </div>
              )}
            </section>

            <section className="p-5 bg-linear-to-b from-indigo-50 to-white space-y-4">
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
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Note de planification (optionnel)</label>
                <input
                  type="text"
                  value={form.next_appointment_reason}
                  onChange={(e) => setForm((prev) => ({ ...prev, next_appointment_reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: contrôle post-op, point de vigilance"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Note clinique de départ (optionnel)</label>
                <textarea
                  rows="3"
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: douleur initiale, examen clinique, contexte de départ"
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
              disabled={loading || !!activePatientTreatment}
              className="px-5 py-2 text-sm font-semibold text-white bg-linear-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? 'En cours...' : 'Démarrer le suivi'}
            </button>
          </div>
        </form>

        {/* Modal de validation des prix */}
        {showPricingModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-linear-to-r from-emerald-50 to-teal-50">
                <h3 className="text-lg font-bold text-gray-900">Validation des prix des actes</h3>
                <p className="text-sm text-gray-600 mt-1">Vérifiez et ajustez les prix unitaires si nécessaire</p>
              </div>

              <div className="px-6 py-4 max-h-96 overflow-y-auto space-y-3">
                {form.acts.map((selectedAct) => {
                  const act = dentalActs.find((item) => Number(item.id) === Number(selectedAct.dental_act_id));
                  const currentPrice = Number(actPrices[selectedAct.dental_act_id] ?? act?.tarif ?? 0);
                  const lineTotal = currentPrice * selectedAct.quantity;

                  return (
                    <div key={selectedAct.dental_act_id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {act?.code ? `${act.code} - ` : ''}{act?.name}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Quantité: {selectedAct.quantity}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <label className="text-xs font-semibold text-gray-700 mb-1">Prix unitaire</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={actPrices[selectedAct.dental_act_id] ?? String(act?.tarif ?? 0)}
                            onChange={(e) => {
                              setActPrices((prev) => ({
                                ...prev,
                                [selectedAct.dental_act_id]: e.target.value,
                              }));
                            }}
                            className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="flex flex-col items-end">
                          <label className="text-xs font-semibold text-gray-700 mb-1">Sous-total</label>
                          <div className="w-32 px-2 py-1 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg text-right">
                            {lineTotal.toLocaleString()} FCFA
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-sm text-gray-600">Total des actes :</p>
                  <p className="text-2xl font-bold text-emerald-700">{totalActsWithCustomPrices.toLocaleString()} FCFA</p>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPricingModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Modifier les champs
                  </button>
                  <button
                    type="button"
                    onClick={confirmTreatment}
                    disabled={loading}
                    className="px-5 py-2 text-sm font-semibold text-white bg-linear-to-r from-emerald-600 to-teal-600 rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? 'Création...' : 'Confirmer et démarrer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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

export default StartTreatmentWorkspace;