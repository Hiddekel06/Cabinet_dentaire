import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { medicalCertificateAPI, medicalRecordAPI, patientAPI, patientTreatmentAPI } from '../services/api';

// Icônes
const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const MailIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LocationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TreatmentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const SessionIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CertificateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

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

  const ptNameById = patientTreatments.reduce((acc, pt) => {
    acc[pt.id] = pt.name || 'Suivi';
    return acc;
  }, {});

  // Fonction pour afficher les initiales du patient
  const getInitials = () => {
    if (!patient) return '';
    return `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase();
  };

  // Badge de statut pour les traitements
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      planned: { label: 'Planifié', classes: 'bg-blue-100 text-blue-800' },
      in_progress: { label: 'En cours', classes: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Terminé', classes: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Annulé', classes: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status] || { label: status, classes: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.classes}`}>
        {config.label}
      </span>
    );
  };

  // Skeleton loader
  if (loading) {
    return (
      <Layout hideHeader hideSidebar hideFooter fullWidth>
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout hideHeader hideSidebar hideFooter fullWidth>
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <UserIcon />
            <h2 className="mt-4 text-xl font-medium text-gray-900">Patient introuvable</h2>
            <p className="mt-2 text-gray-500">Le patient demandé n'existe pas ou a été supprimé.</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <BackIcon />
              <span className="ml-2">Retour</span>
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideHeader hideSidebar hideFooter fullWidth>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* En-tête avec bouton retour et titre */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              title="Retour"
            >
              <BackIcon />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Dossier patient</h1>
          </div>
        </div>

        {/* Carte d'identité du patient */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserIcon />
              Identité du patient
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl">
                {getInitials()}
              </div>
              <div>
                <div className="text-xl font-semibold text-gray-900">
                  {patient.first_name} {patient.last_name}
                </div>
                <div className="text-sm text-gray-500">ID patient: #{patient.id}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <PhoneIcon />
                <span className="font-medium">Téléphone :</span>
                <span>{patient.phone || 'Non renseigné'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <MailIcon />
                <span className="font-medium">Email :</span>
                <span>{patient.email || 'Non renseigné'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
                <LocationIcon />
                <span className="font-medium">Adresse :</span>
                <span>{patient.address || 'Non renseignée'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Traitements et suivi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TreatmentIcon />
              Traitements et suivi
            </h2>
          </div>
          <div className="p-6">
            {patientTreatments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <TreatmentIcon />
                <p className="mt-2">Aucun traitement enregistré pour ce patient.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Traitement
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Début
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fin
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sessions
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {patientTreatments.map((pt) => (
                      <tr key={pt.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {pt.name || 'Suivi'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {pt.start_date ? new Date(pt.start_date).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {pt.end_date ? new Date(pt.end_date).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <span className="font-semibold">{pt.completed_sessions || 0}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={pt.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Séances détaillées */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <SessionIcon />
              Séances détaillées
            </h2>
          </div>
          <div className="p-6">
            {records.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <SessionIcon />
                <p className="mt-2">Aucune séance détaillée pour ce patient.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Traitement
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acte réalisé
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prochain acte
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {treatmentNameById[r.patient_treatment_id] || 'Traitement'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {r.treatment_performed || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {r.next_action || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                          {r.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Certificats médicaux */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Bouton pour générer le certificat Word */}
                    <div className="flex justify-end p-4">
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow"
                        onClick={async () => {
                          try {
                            // Exemple de données à adapter selon ton modèle Word
                            const data = {
                              nom: patient ? `${patient.first_name} ${patient.last_name}` : '',
                              date: new Date().toLocaleDateString('fr-FR'),
                              medecin: '', // À compléter selon le contexte utilisateur
                              motif: '', // À compléter selon le contexte
                              date_naissance: patient?.birth_date || '',
                            };
                            const response = await medicalCertificateAPI.generate(data);
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', 'certificat_medical.docx');
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                          } catch (error) {
                            alert('Erreur lors de la génération du certificat');
                          }
                        }}
                      >
                        Générer certificat Word
                      </button>
                    </div>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CertificateIcon />
              Certificats médicaux
            </h2>
          </div>
          <div className="p-6">
            {certificates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CertificateIcon />
                <p className="mt-2">Aucun certificat médical pour ce patient.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {/* Type supprimé */}
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Praticien
                      </th>
                      {/* Contenu supprimé */}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {certificates.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        {/* Type supprimé */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {c.issue_date ? new Date(c.issue_date).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {c.issuer?.name || '-'}
                        </td>
                        {/* Contenu supprimé */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PatientDossier;