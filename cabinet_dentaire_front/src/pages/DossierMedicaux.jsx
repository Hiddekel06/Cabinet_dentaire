import React, { useEffect, useState } from 'react';
import { medicalRecordAPI, patientAPI } from '../services/api';
import { Layout } from '../components/Layout';

const DossierMedicaux = () => {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [recordsRes, patientsRes] = await Promise.all([
          medicalRecordAPI.getAll(),
          patientAPI.getAll(),
        ]);
        setMedicalRecords(recordsRes.data.data || recordsRes.data || []);
        setPatients(patientsRes.data.data || patientsRes.data || []);
      } catch (error) {
        setMedicalRecords([]);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getPatientName = (id) => {
    const patient = patients.find((p) => p.id === id);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Inconnu';
  };

  const filteredRecords = medicalRecords.filter((rec) => {
    if (!search) return true;
    const patientName = getPatientName(rec.patient_id).toLowerCase();
    return patientName.includes(search.toLowerCase());
  });

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Dossiers médicaux - Suivi global</h1>
        <input
          type="text"
          placeholder="Rechercher un patient..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 px-3 py-2 border rounded-lg w-full max-w-md"
        />
        {loading ? (
          <div>Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded-lg">
              <thead>
                <tr>
                  <th className="px-4 py-2 border">Patient</th>
                  <th className="px-4 py-2 border">Date</th>
                  <th className="px-4 py-2 border">Traitement effectué</th>
                  <th className="px-4 py-2 border">Prochain acte</th>
                  <th className="px-4 py-2 border">Créé par</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">Aucun dossier trouvé.</td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td className="px-4 py-2 border">{getPatientName(rec.patient_id)}</td>
                      <td className="px-4 py-2 border">{rec.date}</td>
                      <td className="px-4 py-2 border">{rec.treatment_performed}</td>
                      <td className="px-4 py-2 border">{rec.next_action || '-'}</td>
                      <td className="px-4 py-2 border">{rec.creator?.name || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DossierMedicaux;
