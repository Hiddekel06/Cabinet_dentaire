import { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { patientAPI, treatmentAPI, patientTreatmentAPI } from '../services/api';

const PatientTreatmentsHistory = () => {
  const [treatments, setTreatments] = useState([]);
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
      const treatmentName = (pt.treatment?.name || '').toLowerCase();
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
        <div className="mb-4 flex items-center gap-2">
          <input
            type="text"
            placeholder="Rechercher patient ou traitement..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-3 py-2 border rounded-lg w-64"
          />
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left">Patient</th>
                <th className="p-2 text-left">Traitement</th>
                <th className="p-2 text-left">Début</th>
                <th className="p-2 text-left">Fin</th>
                <th className="p-2 text-left">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTreatments.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-gray-400">Aucun traitement terminé</td></tr>
              )}
              {filteredTreatments.map((pt) => (
                <tr key={pt.id} className="border-b last:border-b-0">
                  <td className="p-2">{pt.patient?.first_name} {pt.patient?.last_name}</td>
                  <td className="p-2">{pt.treatment?.name}</td>
                  <td className="p-2">{pt.start_date}</td>
                  <td className="p-2">{pt.end_date}</td>
                  <td className="p-2">{pt.completed_sessions}</td>
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
