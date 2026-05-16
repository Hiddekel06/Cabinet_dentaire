import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { clinicalObservationAPI } from '../services/api';

const ClinicalObservationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [observation, setObservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const loadObservation = async () => {
      try {
        const res = await clinicalObservationAPI.getById(id);
        setObservation(res.data);
      } catch (err) {
        console.error('Erreur chargement observation:', err);
      } finally {
        setLoading(false);
      }
    };
    loadObservation();
  }, [id]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await clinicalObservationAPI.generatePDF(id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `observation_${observation?.patient?.last_name || 'patient'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Erreur téléchargement PDF:', err);
      alert('Impossible de générer le PDF pour le moment.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-blue-500 font-bold animate-pulse italic">Chargement du dossier clinique...</div>
        </div>
      </Layout>
    );
  }

  if (!observation) {
    return (
      <Layout>
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 text-center">
          Dossier introuvable.
          <button onClick={() => navigate('/clinical-observations')} className="block mx-auto mt-4 text-sm font-bold underline">Retour à la liste</button>
        </div>
      </Layout>
    );
  }

  const InfoRow = ({ label, value }) => (
    <div className="py-3 flex flex-col sm:flex-row sm:items-center border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest sm:w-1/3">{label}</span>
      <span className="text-sm font-bold text-slate-700 sm:w-2/3">{value || '-'}</span>
    </div>
  );

  const Section = ({ title, children, icon, color = "blue" }) => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-full">
      <div className={`px-6 py-4 bg-linear-to-r from-${color}-50/50 via-white to-white border-b border-slate-50 flex items-center gap-3`}>
        <div className={`p-2 rounded-xl bg-${color}-50 text-${color}-600`}>{icon}</div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 pb-20 font-inter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/clinical-observations')}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Observation de {observation.patient?.first_name} {observation.patient?.last_name}</h1>
              <p className="text-sm text-slate-500 font-medium">Examen réalisé le {new Date(observation.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-blue-600 text-blue-600 text-sm font-black rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm shadow-blue-50 disabled:opacity-50"
            >
              {downloading ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              )}
              IMPRIMER LE DOSSIER
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* GAUCHE : GENERAL & VITALS */}
          <div className="lg:col-span-1 space-y-6">
            <Section title="Paramètres Vitaux" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}>
              <div className="space-y-1">
                <InfoRow label="Conscience" value={observation.consciousness} />
                <InfoRow label="Muqueuses" value={observation.mucous_membranes} />
                <InfoRow label="Tension (TA)" value={observation.blood_pressure} />
                <InfoRow label="Pouls" value={observation.pulse ? `${observation.pulse} bpm` : null} />
                <InfoRow label="Température" value={observation.temperature ? `${observation.temperature} °C` : null} />
                <InfoRow label="Poids" value={observation.weight ? `${observation.weight} Kg` : null} />
                <InfoRow label="Dextro" value={observation.blood_sugar} />
              </div>
            </Section>

            <Section title="Antécédents" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="slate">
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase mb-1">Personnels</h4>
                  <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{observation.atcd_personal_med || 'Néant'}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase mb-1">Familiaux</h4>
                  <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{observation.atcd_family_med || 'Néant'}</p>
                </div>
              </div>
            </Section>
          </div>

          {/* DROITE : EXAMENS & SYNTHESE */}
          <div className="lg:col-span-2 space-y-6">
            <Section title="Motif & Histoire" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}>
               <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-black text-blue-500 uppercase mb-1">Motif de consultation</h4>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{observation.reason_for_consultation || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-blue-500 uppercase mb-1">Histoire de la maladie</h4>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{observation.history_of_illness || 'Non renseigné'}</p>
                  </div>
               </div>
            </Section>

            <Section title="Examen Physique (Par appareil)" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} color="indigo">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Cardio', 'Pulmonaire', 'Neuro', 'Digestif', 'Locomoteur'].map((app) => {
                  const key = `physical_exam_${app.toLowerCase().replace('é', 'e') === 'neuro' ? 'neurological' : app.toLowerCase().replace('é', 'e')}`;
                  if (!observation[key]) return null;
                  return (
                    <div key={app} className="p-3 bg-indigo-50/30 rounded-2xl border border-indigo-50">
                      <h4 className="text-[10px] font-black text-indigo-500 uppercase mb-1">{app}</h4>
                      <p className="text-xs font-bold text-slate-700">{observation[key]}</p>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="Synthèse & Conclusion" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="emerald">
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/50 rounded-2xl border-2 border-emerald-100">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-1">Diagnostic Positif</h4>
                  <p className="text-base font-black text-emerald-800">{observation.positive_diagnostic || 'EN ATTENTE'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-1">Examens demandés</h4>
                    <p className="text-xs font-bold text-slate-700 italic">{observation.tests_biology} {observation.tests_imaging}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-1">Traitements & Diagnostic</h4>
                    <p className="text-xs font-bold text-slate-700">{observation.treatments}</p>
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ClinicalObservationDetails;
