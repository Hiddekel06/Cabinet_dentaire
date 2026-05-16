import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { clinicalObservationAPI, patientAPI } from '../services/api';

const ClinicalObservationWorkspace = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const patientIdFromState = location.state?.patientId;

  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);

  const [form, setForm] = useState({
    patient_id: patientIdFromState || '',
    date: new Date().toISOString().slice(0, 10),
    reason_for_consultation: '',
    history_of_illness: '',
    atcd_personal_med: '',
    atcd_personal_chir: '',
    atcd_family_med: '',
    atcd_family_chir: '',
    consciousness: 'Alerte',
    mucous_membranes: '',
    blood_pressure: '',
    pulse: '',
    temperature: '',
    blood_sugar: '',
    weight: '',
    skin_fold_major: '',
    skin_fold_minor: '',
    lower_limb_edema: '',
    calves: '',
    physical_exam_cardio: '',
    physical_exam_pulmonary: '',
    physical_exam_neurological: '',
    physical_exam_locomotor: '',
    physical_exam_digestive: '',
    physical_exam_others: '',
    syndromic_summary: '',
    diagnostic_hypotheses: '',
    emergency_management: '',
    positive_diagnostic: '',
    tests_biology: '',
    tests_imaging: '',
    treatments: '',
    follow_up: '',
  });

  const [activeSection, setActiveSection] = useState('general');

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await patientAPI.getAll(1, { per_page: 500 });
        setPatients(res.data?.data || []);
      } catch (err) {
        console.error('Erreur chargement patients:', err);
      } finally {
        setPatientsLoading(false);
      }
    };
    loadPatients();
  }, []);

  const handleSelectPatient = (patient) => {
    setForm(prev => ({ ...prev, patient_id: patient.id }));
    setSearchTerm(`${patient.first_name} ${patient.last_name}`);
    setShowPatientList(false);
  };

  const filteredPatients = patients.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient_id) {
      alert('Veuillez sélectionner un patient.');
      return;
    }

    setLoading(true);
    try {
      await clinicalObservationAPI.create(form);
      navigate('/clinical-observations');
    } catch (err) {
      console.error('Erreur création observation:', err);
      alert('Erreur lors de l\'enregistrement de l\'observation.');
    } finally {
      setLoading(false);
    }
  };

  const SectionButton = ({ id, label, icon }) => (
    <button
      type="button"
      onClick={() => setActiveSection(id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
        activeSection === id 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
        : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nouvelle Observation Clinique</h1>
            <p className="text-gray-500 mt-1">Examen complet et anamnèse détaillée</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/clinical-observations')}
              className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !form.patient_id}
              className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer le dossier'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Latérale du Workspace */}
          <div className="lg:col-span-1 space-y-2">
            <SectionButton 
              id="general" 
              label="Général & Motif" 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} 
            />
            <SectionButton 
              id="atcd" 
              label="Antécédents (ATCD)" 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
            />
            <SectionButton 
              id="vitals" 
              label="Signes Vitaux" 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>} 
            />
            <SectionButton 
              id="physical" 
              label="Examen Physique" 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} 
            />
            <SectionButton 
              id="synthesis" 
              label="Synthèse & Plan" 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
            />
          </div>

          {/* Formulaire Principal */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 min-h-[600px]">
            <form className="space-y-8">
              
              {/* SECTION : GENERAL */}
              {activeSection === 'general' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Patient *</label>
                    <input
                      type="text"
                      placeholder="Chercher un patient..."
                      className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 font-bold"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setShowPatientList(true); }}
                      onFocus={() => setShowPatientList(true)}
                    />
                    {showPatientList && searchTerm && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-60 overflow-y-auto">
                        {filteredPatients.map(p => (
                          <button key={p.id} type="button" onClick={() => handleSelectPatient(p)} className="w-full text-left px-5 py-3 hover:bg-blue-50 border-b border-slate-50 last:border-b-0">
                            <p className="font-bold text-slate-900">{p.first_name} {p.last_name}</p>
                            <p className="text-xs text-slate-500">{p.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date de l'examen</label>
                      <input type="date" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Motif de consultation</label>
                    <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Pourquoi le patient consulte-t-il ?" value={form.reason_for_consultation} onChange={e => setForm({...form, reason_for_consultation: e.target.value})} />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Histoire de la maladie</label>
                    <textarea rows="4" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Chronologie des symptômes..." value={form.history_of_illness} onChange={e => setForm({...form, history_of_illness: e.target.value})} />
                  </div>
                </div>
              )}

              {/* SECTION : ATCD */}
              {activeSection === 'atcd' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight border-b pb-2">Antécédents Personnels</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Médicaux</label>
                      <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.atcd_personal_med} onChange={e => setForm({...form, atcd_personal_med: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Chirurgicaux</label>
                      <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.atcd_personal_chir} onChange={e => setForm({...form, atcd_personal_chir: e.target.value})} />
                    </div>
                  </div>

                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight border-b pb-2 mt-8">Antécédents Familiaux</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Médicaux</label>
                      <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.atcd_family_med} onChange={e => setForm({...form, atcd_family_med: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Chirurgicaux</label>
                      <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.atcd_family_chir} onChange={e => setForm({...form, atcd_family_chir: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION : VITALS */}
              {activeSection === 'vitals' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Conscience</label>
                      <input type="text" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.consciousness} onChange={e => setForm({...form, consciousness: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Muqueuses</label>
                      <input type="text" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.mucous_membranes} onChange={e => setForm({...form, mucous_membranes: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tension (TA)</label>
                      <input type="text" placeholder="12/8" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.blood_pressure} onChange={e => setForm({...form, blood_pressure: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Pouls (bpm)</label>
                      <input type="number" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.pulse} onChange={e => setForm({...form, pulse: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Température (°C)</label>
                      <input type="number" step="0.1" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.temperature} onChange={e => setForm({...form, temperature: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Dextro (G/L)</label>
                      <input type="text" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.blood_sugar} onChange={e => setForm({...form, blood_sugar: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Poids (Kg)</label>
                      <input type="number" step="0.1" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Grand pli cutané / Petit pli</label>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Grand" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.skin_fold_major} onChange={e => setForm({...form, skin_fold_major: e.target.value})} />
                        <input type="text" placeholder="Petit" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.skin_fold_minor} onChange={e => setForm({...form, skin_fold_minor: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">OMI / Mollets</label>
                      <div className="flex gap-2">
                        <input type="text" placeholder="OMI" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.lower_limb_edema} onChange={e => setForm({...form, lower_limb_edema: e.target.value})} />
                        <input type="text" placeholder="Mollets" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.calves} onChange={e => setForm({...form, calves: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION : PHYSICAL */}
              {activeSection === 'physical' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cardiovasculaire</label>
                      <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.physical_exam_cardio} onChange={e => setForm({...form, physical_exam_cardio: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Pulmonaire</label>
                      <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.physical_exam_pulmonary} onChange={e => setForm({...form, physical_exam_pulmonary: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Neurologique</label>
                      <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.physical_exam_neurological} onChange={e => setForm({...form, physical_exam_neurological: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Locomoteur</label>
                      <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.physical_exam_locomotor} onChange={e => setForm({...form, physical_exam_locomotor: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Digestif</label>
                      <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.physical_exam_digestive} onChange={e => setForm({...form, physical_exam_digestive: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Autres appareils</label>
                      <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.physical_exam_others} onChange={e => setForm({...form, physical_exam_others: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION : SYNTHESIS */}
              {activeSection === 'synthesis' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Résumé Syndromique</label>
                    <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.syndromic_summary} onChange={e => setForm({...form, syndromic_summary: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hypothèses Diagnostiques</label>
                      <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.diagnostic_hypotheses} onChange={e => setForm({...form, diagnostic_hypotheses: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">CAT d'urgence</label>
                      <textarea rows="3" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.emergency_management} onChange={e => setForm({...form, emergency_management: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Examens Demandés</h4>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Biologie</label>
                      <textarea rows="2" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.tests_biology} onChange={e => setForm({...form, tests_biology: e.target.value})} />
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mt-3 block">Imageries (Echo, Radio...)</label>
                      <textarea rows="2" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.tests_imaging} onChange={e => setForm({...form, tests_imaging: e.target.value})} />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Plan Final</h4>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Diagnostic Positif</label>
                      <textarea rows="2" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.positive_diagnostic} onChange={e => setForm({...form, positive_diagnostic: e.target.value})} />
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mt-3 block">Traitements & Diagnostic</label>
                      <textarea rows="4" className="w-full mt-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500" value={form.treatments} onChange={e => setForm({...form, treatments: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ClinicalObservationWorkspace;
