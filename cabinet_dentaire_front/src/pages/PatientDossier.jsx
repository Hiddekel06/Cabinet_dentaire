import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { medicalCertificateAPI, medicalRecordAPI, patientAPI, patientTreatmentAPI } from '../services/api';

const PatientDossier = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [patientTreatments, setPatientTreatments] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [patientRes, recordsRes, certificatesRes, treatmentsRes] = await Promise.all([
          patientAPI.getById(id),
          medicalRecordAPI.getByPatient(id),
          medicalCertificateAPI.getByPatient(id),
          patientTreatmentAPI.getAll({ patient_id: id })
        ]);
        setPatient(patientRes.data.data || patientRes.data || null);
        setRecords(recordsRes.data.data || recordsRes.data || []);
        setCertificates(certificatesRes.data.data || certificatesRes.data || []);
        setPatientTreatments(treatmentsRes.data.data || treatmentsRes.data || []);
      } catch {
        setPatient(null);
        setRecords([]);
        setCertificates([]);
        setPatientTreatments([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const treatmentNameById = patientTreatments.reduce((acc, pt) => {
    acc[pt.id] = pt.treatment?.name || 'Traitement';
    return acc;
  }, {});

  return (
    <Layout hideHeader hideSidebar hideFooter fullWidth>
      <div className="w-full py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dossier patient</h1>
          <button
            className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            onClick={() => navigate(-1)}
          >
            Retour
          </button>
        </div>

        {loading ? (
          <div>Chargement...</div>
        ) : !patient ? (
          <div className="text-gray-500">Patient introuvable.</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Identite</h2>
              <div className="text-sm text-gray-700">
                <div><span className="font-medium">Nom :</span> {patient.first_name} {patient.last_name}</div>
                <div><span className="font-medium">Telephone :</span> {patient.phone || '-'}</div>
                <div><span className="font-medium">Email :</span> {patient.email || '-'}</div>
                <div><span className="font-medium">Adresse :</span> {patient.address || '-'}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Traitements et suivi</h2>
              {patientTreatments.length === 0 ? (
                <div className="text-gray-500">Aucun traitement.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-2 text-left">Traitement</th>
                        <th className="p-2 text-left">Debut</th>
                        <th className="p-2 text-left">Fin</th>
                        <th className="p-2 text-left">Sessions</th>
                        <th className="p-2 text-left">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientTreatments.map((pt) => (
                        <tr key={pt.id} className="border-b last:border-b-0">
                          <td className="p-2 font-medium">{pt.treatment?.name || 'Traitement'}</td>
                          <td className="p-2">{pt.start_date || '-'}</td>
                          <td className="p-2">{pt.end_date || '-'}</td>
                          <td className="p-2">{pt.completed_sessions || 0}</td>
                          <td className="p-2">{pt.status || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Seances detaillees</h2>
              {records.length === 0 ? (
                <div className="text-gray-500">Aucune seance detaillee.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-2 text-left">Traitement</th>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Acte</th>
                        <th className="p-2 text-left">Prochain acte</th>
                        <th className="p-2 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id} className="border-b last:border-b-0">
                          <td className="p-2">{treatmentNameById[r.patient_treatment_id] || 'Traitement'}</td>
                          <td className="p-2">{r.date || '-'}</td>
                          <td className="p-2">{r.treatment_performed}</td>
                          <td className="p-2">{r.next_action || '-'}</td>
                          <td className="p-2">{r.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-lg font-semibold mb-2">Certificats medicaux</h2>
              {certificates.length === 0 ? (
                <div className="text-gray-500">Aucun certificat medical.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Praticien</th>
                        <th className="p-2 text-left">Contenu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certificates.map((c) => (
                        <tr key={c.id} className="border-b last:border-b-0">
                          <td className="p-2 font-medium">{c.certificate_type}</td>
                          <td className="p-2">{c.issue_date || '-'}</td>
                          <td className="p-2">{c.issuer?.name || '-'}</td>
                          <td className="p-2">{c.content}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PatientDossier;
