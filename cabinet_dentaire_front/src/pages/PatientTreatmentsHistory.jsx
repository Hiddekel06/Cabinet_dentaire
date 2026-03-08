import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { patientTreatmentAPI } from '../services/api';

const PatientTreatmentsHistory = () => {
  const [treatments, setTreatments] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadTreatments();
  }, []);

  const loadTreatments = async () => {
    setLoading(true);
    try {
      const res = await patientTreatmentAPI.getAll({ status: 'completed' });
      setTreatments(res.data.data || []);
    } catch (error) {
      console.error('Erreur chargement traitements terminés:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTreatments = treatments.filter((pt) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const patientName = `${pt.patient?.first_name || ''} ${pt.patient?.last_name || ''}`.toLowerCase();
      const treatmentName = (pt.name || '').toLowerCase();
      if (!patientName.includes(search) && !treatmentName.includes(search)) {
        return false;
      }
    }
    return true;
  });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Historique des traitements terminés</h1>
        {/* Barre de recherche harmonisée */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Rechercher patient ou traitement..."
                  className="block w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-normal placeholder-gray-400"
                  style={{ maxWidth: 300, fontFamily: 'Inter, Arial, sans-serif' }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {/* Place pour d'autres filtres si besoin */}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left">Patient</th>
                <th className="p-2 text-left">Suivi</th>
                <th className="p-2 text-left">Début</th>
                <th className="p-2 text-left">Fin</th>
              </tr>
            </thead>
            <tbody>
              {filteredTreatments.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-gray-400">Aucun traitement terminé</td></tr>
              )}
              {filteredTreatments.map((pt) => (
                <tr key={pt.id} className="border-b last:border-b-0">
                  <td className="p-2">
                    <span className="font-semibold text-blue-600">{pt.patient?.first_name} {pt.patient?.last_name}</span>
                    {pt.patient && (
                      <button
                        className="ml-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:text-blue-900 font-medium text-xs shadow-sm transition-colors flex items-center gap-1"
                        onClick={() => navigate(`/patients/${pt.patient.id}/dossier`)}
                        title="Voir la fiche du patient"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Voir fiche patient
                      </button>
                    )}
                  </td>
                  <td className="p-2">{pt.name}</td>
                  <td className="p-2">{pt.start_date ? new Date(pt.start_date).toLocaleDateString('fr-FR') : ''}</td>
                  <td className="p-2">{pt.end_date ? new Date(pt.end_date).toLocaleDateString('fr-FR') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default PatientTreatmentsHistory;
