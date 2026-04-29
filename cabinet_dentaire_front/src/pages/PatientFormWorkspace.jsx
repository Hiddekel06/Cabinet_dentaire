import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { patientAPI } from '../services/api';

const initialForm = {
  first_name: '',
  last_name: '',
  phone: '',
  gender: 'M',
  age: '',
  address: '',
  general_state: '',
  contact_first_name: '',
  contact_last_name: '',
  contact_phone: '',
  contact_relationship: '',
  contact_is_patient: false,
  contact_patient_id: '',
};

const relationshipLabel = {
  tuteur_legal: 'Tuteur legal',
  parent: 'Parent',
  proche: 'Proche',
  autre: 'Autre',
};

const PatientFormWorkspace = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newPatientId, setNewPatientId] = useState(null);

  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState([]);
  const [contactSearchLoading, setContactSearchLoading] = useState(false);

  const calculateAgeFromDate = (value) => {
    if (!value) return '';
    const dob = new Date(value);
    if (Number.isNaN(dob.getTime())) return '';

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age -= 1;
    }

    return age >= 0 ? String(age) : '';
  };

  useEffect(() => {
    if (!isEdit) return;

    let cancelled = false;

    const loadPatient = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await patientAPI.getById(id);
        if (cancelled) return;

        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          gender: data.gender || 'M',
          age: calculateAgeFromDate(data.date_of_birth),
          address: data.address || '',
          general_state: data.general_state || '',
          contact_first_name: data.contact_first_name || '',
          contact_last_name: data.contact_last_name || '',
          contact_phone: data.contact_phone || '',
          contact_relationship: data.contact_relationship || '',
          contact_is_patient: Boolean(data.contact_is_patient),
          contact_patient_id: data.contact_patient_id ? String(data.contact_patient_id) : '',
        });

        if (data.contact_is_patient && data.contact_first_name && data.contact_last_name) {
          setContactSearchTerm(`${data.contact_first_name} ${data.contact_last_name}`.trim());
        }
      } catch (err) {
        if (!cancelled) {
          setError('Impossible de charger le patient.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPatient();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  useEffect(() => {
    const query = contactSearchTerm.trim();
    if (!form.contact_is_patient || query.length < 2) {
      setContactSearchResults([]);
      setContactSearchLoading(false);
      return;
    }

    let cancelled = false;

    const loadContactCandidates = async () => {
      setContactSearchLoading(true);
      try {
        const { data } = await patientAPI.getAll(1, { search: query, per_page: 8 });
        const list = Array.isArray(data?.data) ? data.data : [];
        const filtered = list.filter((candidate) => {
          if (!candidate?.id) return false;
          if (isEdit && String(candidate.id) === String(id)) return false;
          return true;
        });

        if (!cancelled) {
          setContactSearchResults(filtered);
        }
      } catch {
        if (!cancelled) {
          setContactSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setContactSearchLoading(false);
        }
      }
    };

    loadContactCandidates();

    return () => {
      cancelled = true;
    };
  }, [contactSearchTerm, form.contact_is_patient, id, isEdit]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'contact_is_patient' && !checked) {
      setContactSearchTerm('');
      setContactSearchResults([]);
      setForm((prev) => ({
        ...prev,
        contact_is_patient: false,
        contact_patient_id: '',
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (name === 'contact_phone' || name === 'contact_first_name' || name === 'contact_last_name') {
      setForm((prev) => ({
        ...prev,
        contact_patient_id: prev.contact_is_patient ? '' : prev.contact_patient_id,
      }));
    }
  };

  const selectContactPatient = (candidate) => {
    const fallbackPhone = candidate.phone || candidate.contact_phone || '';
    setForm((prev) => ({
      ...prev,
      contact_patient_id: String(candidate.id),
      contact_first_name: candidate.first_name || prev.contact_first_name,
      contact_last_name: candidate.last_name || prev.contact_last_name,
      contact_phone: fallbackPhone || prev.contact_phone,
      contact_is_patient: true,
    }));
    setContactSearchTerm(`${candidate.first_name || ''} ${candidate.last_name || ''}`.trim());
    setContactSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.first_name || !form.last_name || !form.gender || !form.age) {
      setError('Prenom, nom, sexe et age sont obligatoires.');
      return;
    }

    const ageValue = Number(form.age);
    if (!Number.isInteger(ageValue) || ageValue < 0 || ageValue > 120) {
      setError("L'age doit etre un nombre entier entre 0 et 120.");
      return;
    }

    const hasPersonalPhone = form.phone.trim() !== '';
    if (!hasPersonalPhone) {
      if (
        !form.contact_first_name.trim()
        || !form.contact_last_name.trim()
        || !form.contact_phone.trim()
        || !form.contact_relationship
      ) {
        setError('Sans telephone personnel, il faut un contact complet (nom, prenom, relation, telephone).');
        return;
      }

      if (ageValue < 18 && !['tuteur_legal', 'parent'].includes(form.contact_relationship)) {
        setError('Pour un mineur, la relation doit etre Tuteur legal ou Parent.');
        return;
      }
    }

    const payload = {
      ...form,
      age: ageValue,
      phone: form.phone.trim(),
      address: form.address.trim(),
      general_state: form.general_state.trim(),
      contact_first_name: form.contact_first_name.trim(),
      contact_last_name: form.contact_last_name.trim(),
      contact_phone: form.contact_phone.trim(),
      contact_patient_id: form.contact_patient_id ? Number(form.contact_patient_id) : null,
    };

    if (form.contact_is_patient && !payload.contact_patient_id) {
      setError('Selectionnez le patient correspondant au contact dans la liste de recherche.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await patientAPI.update(id, payload);
        navigate('/patients', {
          state: {
            success: 'Patient mis a jour avec succes.'
          },
        });
      } else {
        const res = await patientAPI.create(payload);
        const createdPatientId = res?.data?.id;
        setNewPatientId(createdPatientId);
        setShowSuccessModal(true);
        return;
      }
    } catch (err) {
      const apiErrors = err.response?.data?.errors || {};
      const apiMessage = apiErrors.phone?.[0]
        || apiErrors.contact_phone?.[0]
        || apiErrors.contact_first_name?.[0]
        || apiErrors.contact_last_name?.[0]
        || apiErrors.contact_relationship?.[0]
        || apiErrors.contact_patient_id?.[0]
        || err.response?.data?.message
        || 'Erreur lors de la sauvegarde du patient';
      setError(apiMessage);
    } finally {
      setSaving(false);
    }
  };

  const hasPersonalPhone = form.phone.trim() !== '';
  const isContactSectionLocked = hasPersonalPhone;

  const handleStartTreatment = () => {
    setShowSuccessModal(false);
    if (newPatientId) {
      navigate('/treatments/new', {
        state: { patientId: newPatientId },
      });
    }
  };

  const handleGoToPatients = () => {
    setShowSuccessModal(false);
    setNewPatientId(null);
    navigate('/patients', {
      state: {
        success: 'Patient cree avec succes.',
      },
    });
  };

  return (
    <>
      <Layout>
      <div className="p-6 space-y-6">
        <div className="rounded-2xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{isEdit ? 'Modifier un patient' : 'Nouveau patient'}</h1>
                <p className="text-xs text-slate-300 mt-0.5">Workspace patient - saisie guidée en sections</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
              {isEdit ? 'Edition' : 'Creation'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/patients')}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Retour a la liste
        </button>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ring-1 ring-slate-100">
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">1. Patient</span>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">2. Contact</span>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">3. Resume</span>
          </div>

          {loading ? (
            <div className="p-5 text-gray-500">Chargement...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3">
                <section className="p-5 border-b lg:border-b-0 lg:border-r border-gray-200 bg-linear-to-b from-blue-50 to-white space-y-4">
                  <h2 className="text-sm font-bold text-blue-900">1. Identite patient</h2>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Prenom *</label>
                    <input name="first_name" value={form.first_name} onChange={handleFormChange} className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nom *</label>
                    <input name="last_name" value={form.last_name} onChange={handleFormChange} className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Telephone patient</label>
                    <input name="phone" value={form.phone} onChange={handleFormChange} className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    <p className="text-[11px] text-gray-500 mt-1">Optionnel si un contact tiers est renseigne.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Sexe *</label>
                    <select name="gender" value={form.gender} onChange={handleFormChange} className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                      <option value="M">Homme</option>
                      <option value="F">Femme</option>
                      <option value="Other">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Age *</label>
                    <input type="number" min="0" max="120" name="age" value={form.age} onChange={handleFormChange} className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500" required />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Adresse du patient</label>
                    <input
                      name="address"
                      value={form.address}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Adresse"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Etat general du patient</label>
                    <textarea
                      name="general_state"
                      value={form.general_state}
                      onChange={handleFormChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Champ libre"
                    />
                  </div>
                </section>

                <section className="p-5 border-b lg:border-b-0 lg:border-r border-gray-200 bg-linear-to-b from-amber-50 to-white space-y-4">
                  <h2 className="text-sm font-bold text-amber-900">2. Contact tiers</h2>

                  {hasPersonalPhone ? (
                    <div className="text-xs text-amber-800 border border-amber-200 bg-amber-100 rounded-lg px-3 py-2">
                      Le patient est joignable directement. La section contact tiers reste optionnelle.
                    </div>
                  ) : (
                    <div className="text-xs text-amber-800 border border-amber-200 bg-amber-100 rounded-lg px-3 py-2">
                      Patient sans telephone personnel: renseigner un contact joignable.
                    </div>
                  )}

                  <fieldset disabled={isContactSectionLocked} className={isContactSectionLocked ? 'space-y-4 opacity-60' : 'space-y-4'}>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Prenom du contact {!hasPersonalPhone && '*'}</label>
                      <input name="contact_first_name" value={form.contact_first_name} onChange={handleFormChange} className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500" required={!hasPersonalPhone} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Nom du contact {!hasPersonalPhone && '*'}</label>
                      <input name="contact_last_name" value={form.contact_last_name} onChange={handleFormChange} className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500" required={!hasPersonalPhone} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Telephone du contact {!hasPersonalPhone && '*'}</label>
                      <input name="contact_phone" value={form.contact_phone} onChange={handleFormChange} className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500" required={!hasPersonalPhone} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Relation {!hasPersonalPhone && '*'}</label>
                      <select name="contact_relationship" value={form.contact_relationship} onChange={handleFormChange} className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500" required={!hasPersonalPhone}>
                        <option value="">Selectionner...</option>
                        <option value="tuteur_legal">Tuteur legal</option>
                        <option value="parent">Parent</option>
                        <option value="proche">Proche</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 border border-amber-200 bg-white rounded-lg px-3 py-2">
                      <input id="contact_is_patient" type="checkbox" name="contact_is_patient" checked={form.contact_is_patient} onChange={handleFormChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                      Ce contact est aussi un patient du cabinet.
                    </label>

                    {form.contact_is_patient && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-700 block">Rechercher le patient contact *</label>
                        <input
                          value={contactSearchTerm}
                          onChange={(e) => {
                            setContactSearchTerm(e.target.value);
                            setForm((prev) => ({ ...prev, contact_patient_id: '' }));
                          }}
                          placeholder="Tapez le nom, prenom ou telephone"
                          className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500"
                        />

                        {contactSearchLoading && <p className="text-xs text-gray-500">Recherche en cours...</p>}

                        {!contactSearchLoading && contactSearchTerm.trim().length >= 2 && contactSearchResults.length > 0 && (
                          <div className="max-h-44 overflow-y-auto border border-amber-200 rounded-lg bg-white">
                            {contactSearchResults.map((candidate) => (
                              <button
                                type="button"
                                key={candidate.id}
                                className="w-full text-left px-3 py-2 hover:bg-amber-50 border-b border-gray-100 last:border-b-0"
                                onClick={() => selectContactPatient(candidate)}
                              >
                                <span className="text-sm font-medium text-gray-900">{candidate.first_name} {candidate.last_name}</span>
                                <span className="ml-2 text-xs text-gray-500">{candidate.phone || candidate.contact_phone || 'Sans telephone'}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {!contactSearchLoading && contactSearchTerm.trim().length >= 2 && contactSearchResults.length === 0 && (
                          <p className="text-xs text-gray-500">Aucun patient correspondant.</p>
                        )}
                      </div>
                    )}
                  </fieldset>

                  {isContactSectionLocked && (
                    <p className="text-[11px] text-amber-700">
                      Enlevez le numero du patient pour activer la saisie du contact tiers.
                    </p>
                  )}
                </section>

                <section className="p-5 bg-linear-to-b from-emerald-50 to-white space-y-4">
                  <h2 className="text-sm font-bold text-emerald-900">3. Resume validation</h2>

                  <div className="text-sm text-emerald-900 border border-emerald-200 bg-emerald-100 rounded-lg px-3 py-3 space-y-2">
                    <p><span className="font-semibold">Patient:</span> {form.first_name || '-'} {form.last_name || ''}</p>
                    <p><span className="font-semibold">Telephone patient:</span> {hasPersonalPhone ? form.phone : 'Non renseigne'}</p>
                    <p><span className="font-semibold">Adresse:</span> {form.address || 'Non renseignee'}</p>
                    <p><span className="font-semibold">Etat general:</span> {form.general_state || 'Non renseigne'}</p>
                    {!hasPersonalPhone && (
                      <p>
                        <span className="font-semibold">Contact tiers:</span> {[form.contact_first_name, form.contact_last_name].filter(Boolean).join(' ') || 'Non renseigne'}
                        {form.contact_relationship ? ` (${relationshipLabel[form.contact_relationship] || form.contact_relationship})` : ''}
                        {form.contact_phone ? ` - ${form.contact_phone}` : ''}
                      </p>
                    )}
                    {form.contact_is_patient && form.contact_patient_id && (
                      <p><span className="font-semibold">Contact lie:</span> Patient ID {form.contact_patient_id}</p>
                    )}
                  </div>

                  {error && <div className="text-red-700 text-sm border border-red-200 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
                </section>
              </div>

              <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/patients')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-linear-to-r from-emerald-600 to-teal-600 rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? 'Enregistrement...' : (isEdit ? 'Mettre a jour' : 'Creer le patient')}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
      </Layout>

    {showSuccessModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center">Patient ajouté avec succès</h2>
          <p className="text-sm text-gray-600 text-center">
            Le patient a été enregistré. Voulez-vous commencer un traitement avec lui dès maintenant ?
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleGoToPatients}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Non, plus tard
            </button>
            <button
              onClick={handleStartTreatment}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-linear-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors"
            >
              Oui, commencer
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default PatientFormWorkspace;
