import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { clinicalObservationAPI, patientAPI } from '../services/api';
import { Can } from '../components/Can';

const ClinicalObservations = () => {
  const navigate = useNavigate();
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 15 };
      if (selectedPatientId) params.patient_id = selectedPatientId;
      
      const res = await clinicalObservationAPI.getAll(params);
      setObservations(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);

      // Charger les patients pour le filtre si non chargés
      if (patients.length === 0) {
        const pRes = await patientAPI.getAll(1, { per_page: 500 });
        setPatients(pRes.data?.data || []);
      }
    } catch (err) {
      console.error('Erreur chargement observations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, selectedPatientId]);

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('fr-FR');
  };

  const filteredObservations = useMemo(() => {
    if (!searchTerm) return observations;
    const term = searchTerm.toLowerCase();
    return observations.filter(obs => {
      const pName = `${obs.patient?.first_name} ${obs.patient?.last_name}`.toLowerCase();
      return pName.includes(term) || obs.reason_for_consultation?.toLowerCase().includes(term);
    });
  }, [observations, searchTerm]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-inter">Observations Cliniques</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Historique des examens cliniques complets et anamnèses</p>
          </div>
          <button
            onClick={() => navigate('/clinical-observations/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle Observation
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Rechercher un patient ou un motif..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium min-w-[200px]"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
          >
            <option value="">Tous les patients</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
            ))}
          </select>
        </div>

        {/* Liste */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden font-inter">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Patient</th>
                <th className="px-6 py-4 text-left">Motif de consultation</th>
                <th className="px-6 py-4 text-left">Praticien</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="py-20 text-center text-blue-500 font-bold animate-pulse">Chargement de l'historique clinique...</td></tr>
              ) : filteredObservations.length === 0 ? (
                <tr><td colSpan="5" className="py-20 text-center text-gray-400 italic">Aucune observation enregistrée.</td></tr>
              ) : (
                filteredObservations.map((obs) => (
                  <tr key={obs.id} className="hover:bg-blue-50/50 transition-colors cursor-pointer group" onClick={() => navigate(`/clinical-observations/${obs.id}`)}>
                    <td className="px-6 py-4 font-semibold text-blue-600">{formatDate(obs.date)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{obs.patient?.first_name} {obs.patient?.last_name}</span>
                        <span className="text-[10px] text-gray-500 uppercase">{obs.patient?.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 italic max-w-xs truncate">
                      {obs.reason_for_consultation || 'Non spécifié'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold uppercase border border-slate-200">
                        {obs.creator?.name || 'Dr. Inconnu'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg" title="Voir les détails">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v2" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
              <span className="text-xs text-gray-500 font-medium">Page {page} sur {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-30"
                >
                  ← Précédent
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-white rounded-lg border border-blue-200 bg-white disabled:opacity-30 shadow-sm"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ClinicalObservations;
