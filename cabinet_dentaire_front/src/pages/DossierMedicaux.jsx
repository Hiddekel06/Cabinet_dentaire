import React, { useEffect, useState } from 'react';
import { medicalCertificateAPI, medicalRecordAPI, patientAPI } from '../services/api';
import { Layout } from '../components/Layout';

const DossierMedicaux = () => {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientTreatments, setPatientTreatments] = useState([]);
  const [patientCertificates, setPatientCertificates] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const recordsRes = await medicalRecordAPI.getAll({ page });
        const data = recordsRes.data.data || recordsRes.data || [];
        setMedicalRecords(data);
        setTotalPages(recordsRes.data.last_page || 1);
      } catch (error) {
        setMedicalRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page]);

  const getPatientName = (record) => {
    if (record.patient) {
      return `${record.patient.first_name} ${record.patient.last_name}`;
    }
    return 'Inconnu';
  };

  const handlePatientClick = async (patient) => {
    console.log('Patient click:', patient.id);
    setDetailsLoading(true);
    setSelectedPatient(patient);
    try {
      // Appels API pour récupérer les traitements et certificats
      const [treatmentsRes, certificatesRes] = await Promise.all([
        medicalRecordAPI.getByPatient(patient.id),
        medicalCertificateAPI.getByPatient(patient.id)
      ]);
      setPatientTreatments(treatmentsRes.data.data || treatmentsRes.data || []);
      setPatientCertificates(certificatesRes.data.data || certificatesRes.data || []);
    } catch {
      setPatientTreatments([]);
      setPatientCertificates([]);
    } finally {
      setDetailsLoading(false);
    }
  };
  const closePatientDetails = () => {
    setSelectedPatient(null);
    setPatientTreatments([]);
    setPatientCertificates([]);
  };

  const filteredRecords = medicalRecords.filter((rec) => {
    if (!search) return true;
    const patientName = getPatientName(rec).toLowerCase();
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
                      <td className="px-4 py-2 border">
                        <span className="font-semibold text-blue-600">{getPatientName(rec)}</span>
                        <button
                          className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          onClick={() => handlePatientClick(rec.patient)}
                        >
                          Voir fiche patient
                        </button>
                      </td>
                      <td className="px-4 py-2 border">{rec.date}</td>
                      <td className="px-4 py-2 border">{rec.treatment_performed}</td>
                      <td className="px-4 py-2 border">{rec.next_action || '-'}</td>
                      <td className="px-4 py-2 border">{rec.creator?.name || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Précédent
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} sur {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Suivant
                </button>
              </div>
            )}
            {/* Modale fiche patient détaillée */}
            {selectedPatient && (
              <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }} onClick={closePatientDetails}>
                <div className="relative w-full max-w-2xl mx-2 bg-white rounded-lg shadow-lg border border-blue-100" onClick={e => e.stopPropagation()}>
                  <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none" onClick={closePatientDetails} aria-label="Fermer" type="button">&times;</button>
                  <div className="p-6">
                    <h2 className="text-xl font-bold mb-2">Dossier de {selectedPatient.first_name} {selectedPatient.last_name}</h2>
                    <div className="mb-4 text-sm text-gray-600">Contact : {selectedPatient.phone || '-'} | Email : {selectedPatient.email || '-'} | Adresse : {selectedPatient.address || '-'}</div>
                    {detailsLoading ? (<div>Chargement...</div>) : (
                      <>
                        <h3 className="text-lg font-semibold mt-4 mb-2">Traitements</h3>
                        <ul className="mb-4">
                          {patientTreatments.length === 0 ? (<li className="text-gray-400">Aucun traitement</li>) : patientTreatments.map(t => (
                            <li key={t.id} className="mb-2 border-b pb-2">
                              <div className="font-medium">{t.treatment_performed}</div>
                              <div className="text-xs text-gray-500">Date : {t.date} | Prochain acte : {t.next_action || '-'}</div>
                              <div className="text-xs text-gray-500">Notes : {t.notes || '-'}</div>
                            </li>
                          ))}
                        </ul>
                        <h3 className="text-lg font-semibold mt-4 mb-2">Certificats médicaux</h3>
                        <ul>
                          {patientCertificates.length === 0 ? (<li className="text-gray-400">Aucun certificat</li>) : patientCertificates.map(c => (
                            <li key={c.id} className="mb-2 border-b pb-2">
                              <div className="font-medium">Certificat médical</div>
                              <div className="text-xs text-gray-500">Date : {c.issue_date} | Praticien : {c.issuer?.name || '-'}</div>
                              <div className="text-xs text-gray-500">Heure : {c.consultation_time || '-'}</div>
                              <div className="text-xs text-gray-500">
                                Repos : {c.rest_days ? `${c.rest_days} jour(s) à compter du ${c.rest_start_date || '-'}` : '-'}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DossierMedicaux;
