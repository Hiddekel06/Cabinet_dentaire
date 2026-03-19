import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  appointmentAPI,
  authAPI,
  dentalActAPI,
  medicalRecordAPI,
  patientTreatmentAPI,
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

  const [form, setForm] = useState({
    treatment_performed: '',
    next_action: '',
    next_appointment_date: '',
    next_appointment_time: '',
    acts: [],
  });

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [userRes, actsRes, treatmentRes] = await Promise.all([
          authAPI.getUser().catch(() => ({ data: null })),
          dentalActAPI.getAll(),
          patientTreatmentAPI.getById(treatmentId),
        ]);

        setCurrentUser(userRes?.data || null);
        setDentalActs(actsRes?.data?.data || actsRes?.data || []);
        setTreatment(treatmentRes?.data || null);
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
      alert('Veuillez renseigner ce que vous avez fait exactement.');
      return;
    }

    if (!treatment?.next_appointment_id && !form.next_appointment_date) {
      alert('Aucun rendez-vous actuel trouvé. Veuillez renseigner un prochain rendez-vous.');
      return;
    }

    if (form.next_appointment_date) {
      const now = new Date();
      const selectedDateTime = form.next_appointment_time
        ? new Date(`${form.next_appointment_date}T${form.next_appointment_time}`)
        : new Date(`${form.next_appointment_date}T00:00`);

      if (selectedDateTime < now) {
        alert('Impossible de créer un rendez-vous dans le passé.');
        return;
      }
    }

    setLoading(true);
    try {
      let newNextAppointmentId = null;

      if (form.next_appointment_date) {
        const appointmentDateTime = form.next_appointment_time
          ? `${form.next_appointment_date} ${form.next_appointment_time}:00`
          : form.next_appointment_date;

        const appointmentRes = await appointmentAPI.create({
          patient_id: treatment.patient_id,
          dentist_id: currentUser?.id,
          appointment_date: appointmentDateTime,
          duration: null,
          reason: null,
          notes: null,
        });

        newNextAppointmentId = appointmentRes?.data?.id || null;
      }

      const sessionAppointmentId = treatment.next_appointment_id || newNextAppointmentId;

      await medicalRecordAPI.create({
        patient_id: treatment.patient_id,
        patient_treatment_id: treatment.id,
        appointment_id: sessionAppointmentId,
        treatment_performed: form.treatment_performed,
        next_action: form.next_action,
      });

      await patientTreatmentAPI.update(treatment.id, {
        status: 'in_progress',
        completed_sessions: (treatment.completed_sessions || 0) + 1,
        next_appointment_id: newNextAppointmentId,
      });

      if (form.acts.length > 0) {
        await patientTreatmentAPI.addActs(treatment.id, form.acts);
      }

      alert('Séance ajoutée avec succès !');
      navigate('/treatments');
    } catch (error) {
      console.error('Erreur ajout séance:', error);
      let message = 'Erreur lors de l\'ajout de la séance.';
      if (error.response?.data?.message) {
        message = `${message} ${error.response.data.message}`;
      }
      if (error.response?.data?.errors) {
        message = `${message} ${Object.values(error.response.data.errors).flat().join(' | ')}`;
      }
      alert(message);
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

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ajouter une séance</h1>
            <p className="text-sm text-gray-600 mt-1">
              {treatment.patient?.first_name} {treatment.patient?.last_name} - {treatment.name}
            </p>
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

        <form onSubmit={handleAddSession} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
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
              <h2 className="text-sm font-bold text-amber-900">2. Actes à ajouter (optionnel)</h2>
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date (optionnel)</label>
                <input
                  type="date"
                  value={form.next_appointment_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, next_appointment_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
              disabled={loading || isLocked}
              className="px-6 py-2 text-sm font-semibold text-white bg-linear-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer séance'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default StartSessionWorkspace;
