import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { dentalActAPI, patientAPI, patientTreatmentAPI } from '../services/api';

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

  const [form, setForm] = useState({
    patient_id: '',
    name: '',
    acts: [],
    start_date: new Date().toISOString().split('T')[0],
    next_appointment_date: '',
    next_appointment_reason: '',
    notes: '',
  });

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
          const patient = patientsData.find((p) => Number(p.id) === preselectedPatientId);
          if (patient) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient_id || !form.name || !form.next_appointment_date) {
      alert('Veuillez remplir les champs obligatoires.');
      return;
    }

    setLoading(true);
    try {
      await patientTreatmentAPI.create(form);
      alert('Suivi démarré avec succès !');
      navigate('/treatments');
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
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">3. Premier RDV</span>
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
              <h2 className="text-sm font-bold text-indigo-900">3. Premier rendez-vous</h2>

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
      </div>
    </Layout>
  );
};

export default StartTreatmentWorkspace;