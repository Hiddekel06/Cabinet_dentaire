import React, { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { medicalCertificateAPI } from '../services/api';
import { patientAPI } from '../services/api';

const getTodayLocalDate = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getCurrentHourTime = () => {
  const hours = String(new Date().getHours()).padStart(2, '0');
  return `${hours}:00`;
};

const MedicalCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    patient_id: "",
    issue_date: getTodayLocalDate(),
    consultation_time: getCurrentHourTime(),
    rest_days: "",
    rest_start_date: getTodayLocalDate(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadCertificates();
  }, [page]);

  const loadCertificates = async (withLoader = true) => {
    if (withLoader) {
      setLoading(true);
    }
    try {
      const certRes = await medicalCertificateAPI.getAll({ page });
      setCertificates(certRes.data.data || certRes.data || []);
      setTotalPages(certRes.data.last_page || 1);
    } catch {
      setError("Erreur de chargement");
    } finally {
      if (withLoader) {
        setLoading(false);
      }
    }
  };

  const loadPatientsOnDemand = async () => {
    if (patients.length === 0) {
      try {
        const patRes = await patientAPI.getAll(1);
        setPatients(patRes.data.data || patRes.data || []);
      } catch {
        setError("Erreur de chargement des patients");
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await medicalCertificateAPI.create(form);
      const created = res.data?.data || res.data;

      // Optimistic update to avoid an extra fetch and make the UI feel faster.
      if (created) {
        setCertificates((prev) => [created, ...prev].slice(0, Math.max(prev.length, 1)));
      }

      if (page !== 1) {
        setPage(1);
      } else {
        // Silent sync with backend to avoid stale pagination/ordering states.
        void loadCertificates(false);
      }

      setShowModal(false);
      setForm({
        patient_id: "",
        issue_date: getTodayLocalDate(),
        consultation_time: getCurrentHourTime(),
        rest_days: "",
        rest_start_date: getTodayLocalDate(),
      });
    } catch (err) {
      alert("Erreur lors de l'ajout du certificat");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer ce certificat ?")) {
      try {
        await medicalCertificateAPI.delete(id);
        await loadCertificates();
      } catch {
        alert("Erreur lors de la suppression");
      }
    }
  };

  // Téléchargement du certificat Word généré par le backend
  const handleDownloadWord = async (cert) => {
    try {
      const res = await medicalCertificateAPI.generate(cert.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificat_medical_${cert.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erreur lors du téléchargement du certificat PDF");
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificats médicaux</h1>
          <p className="text-gray-600 mt-1">Gérez les certificats délivrés aux patients</p>
        </div>
      </div>

      {/* Tableau des certificats */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-lg bg-linear-to-br from-white/80 via-blue-50/60 to-white/90 backdrop-blur-sm transition-all duration-300 group hover:shadow-2xl hover:border-blue-200">
        <div className="px-4 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Liste des certificats</h2>
            <p className="text-gray-500 text-sm mt-1">Historique des certificats médicaux</p>
          </div>
          <div className="mt-3 sm:mt-0 flex space-x-2">
            <button
              onClick={() => {
                setShowModal(true);
                loadPatientsOnDemand();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-blue-600 text-sm font-medium rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer select-none border border-blue-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau certificat
            </button>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="min-w-150 w-full text-xs sm:text-sm md:text-base">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Patient</th>
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Délivré par</th>
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Heure</th>
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Repos</th>
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {certificates.length > 0 ? certificates.map(c => (
                <tr key={c.id} className="hover:bg-blue-50 transition-colors duration-150 group">
                  <td className="py-2 px-2 sm:py-3 sm:px-4 font-medium text-gray-900 whitespace-nowrap">
                    {c.patient?.first_name} {c.patient?.last_name}
                  </td>
                  <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">
                    {c.issuer?.name || '-'}
                  </td>
                  <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">{c.issue_date}</td>
                  <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">{c.consultation_time || '-'}</td>
                  <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">
                    {c.rest_days ? `${c.rest_days} j dès ${c.rest_start_date || '-'}` : '-'}
                  </td>
                  <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap flex gap-2">
                    <button
                      className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center justify-center"
                      onClick={() => handleDownloadWord(c)}
                      title="Télécharger Word"
                      aria-label="Télécharger Word"
                      type="button"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h16V4H4zm4 8h8m-4-4v8" />
                      </svg>
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 font-semibold inline-flex items-center justify-center"
                      onClick={() => handleDelete(c.id)}
                      title="Supprimer"
                      aria-label="Supprimer"
                      type="button"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">Aucun certificat médical</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-center gap-2">
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
      </div>

      {/* Modal d'ajout */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }} onClick={() => setShowModal(false)}>
          <div className="relative w-full max-w-3xl mx-0.5 bg-white rounded-lg shadow-lg border border-blue-100 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none" onClick={() => setShowModal(false)} aria-label="Fermer" type="button">&times;</button>
            <div className="px-4 pt-6 pb-3 bg-linear-to-r from-blue-50 via-white to-blue-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900">Nouveau certificat médical</h3>
              <p className="text-sm text-gray-500 mt-1">Remplir les informations</p>
            </div>
            <form onSubmit={handleSubmit} className="px-4 py-4 grid grid-cols-1 gap-3 overflow-y-auto max-h-[65vh]">
              <div>
                <label className="text-xs font-semibold text-gray-700">Patient</label>
                <select name="patient_id" value={form.patient_id} onChange={handleChange} className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300" required>
                  <option value="">Sélectionner un patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Date</label>
                <input type="date" name="issue_date" value={form.issue_date} onChange={handleChange} className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Heure de consultation</label>
                <input type="time" step="3600" name="consultation_time" value={form.consultation_time} onChange={handleChange} className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Nombre de jours de repos</label>
                <input type="number" min="1" max="365" name="rest_days" value={form.rest_days} onChange={handleChange} className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300" placeholder="Ex: 3" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Date de début du repos</label>
                <input type="date" name="rest_start_date" value={form.rest_start_date} onChange={handleChange} className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300" />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {saving && (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                      <path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2z"></path>
                    </svg>
                  )}
                  {saving ? 'Ajout en cours...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default MedicalCertificates;
