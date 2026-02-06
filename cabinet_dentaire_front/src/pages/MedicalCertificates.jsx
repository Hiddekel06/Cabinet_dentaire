import React, { useState } from "react";
import { Layout } from "../components/Layout";

// Exemple de données fictives
const fakeCertificates = [
  {
    id: 1,
    patient: "Awa Diop",
    issued_by: "Dr. Ndiaye",
    issue_date: "2026-02-05",
    certificate_type: "Arrêt de travail",
    content: "Arrêt de travail de 3 jours pour raison médicale.",
    file_path: null,
    notes: "Patient souffrant de douleurs aiguës."
  },
  {
    id: 2,
    patient: "Moussa Fall",
    issued_by: "Dr. Ba",
    issue_date: "2026-01-28",
    certificate_type: "Aptitude",
    content: "Certificat d'aptitude pour la pratique sportive.",
    file_path: "certificat_moussa.pdf",
    notes: "Aucun problème détecté."
  }
];

const MedicalCertificates = () => {
  const [certificates, setCertificates] = useState(fakeCertificates);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    patient: "",
    issued_by: "",
    issue_date: "",
    certificate_type: "",
    content: "",
    file_path: null,
    notes: ""
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ajout fictif
    setCertificates([
      {
        id: Date.now(),
        ...form,
        file_path: form.file_path ? form.file_path.name : null
      },
      ...certificates
    ]);
    setShowModal(false);
    setForm({
      patient: "",
      issued_by: "",
      issue_date: "",
      certificate_type: "",
      content: "",
      file_path: null,
      notes: ""
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Supprimer ce certificat ?")) {
      setCertificates(certificates.filter(c => c.id !== id));
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
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-lg bg-gradient-to-br from-white/80 via-blue-50/60 to-white/90 backdrop-blur-sm transition-all duration-300 group hover:shadow-2xl hover:border-blue-200">
        <div className="px-4 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Liste des certificats</h2>
            <p className="text-gray-500 text-sm mt-1">Historique des certificats médicaux</p>
          </div>
          <div className="mt-3 sm:mt-0 flex space-x-2">
            <button
              onClick={() => setShowModal(true)}
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
          <table className="min-w-[600px] w-full text-xs sm:text-sm md:text-base">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Patient</th>
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Délivré par</th>
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Type</th>
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Contenu</th>
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Fichier</th>
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Notes</th>
                <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {certificates.length > 0 ? certificates.map(c => (
                <tr key={c.id} className="hover:bg-blue-50 transition-colors duration-150 group">
                  <td className="py-2 px-2 sm:py-3 sm:px-4 font-medium text-gray-900 whitespace-nowrap">{c.patient}</td>
                  <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">{c.issued_by}</td>
                  <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">{c.issue_date}</td>
                  <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">{c.certificate_type}</td>
                  <td className="py-2 px-2 sm:py-3 sm:px-4 max-w-[240px] truncate">{c.content}</td>
                  <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">
                    {c.file_path ? (
                      <a
                        href={"/files/" + c.file_path}
                        target="_blank"
                        rel="noopener"
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Voir
                      </a>
                    ) : "-"}
                  </td>
                  <td className="py-2 px-2 sm:py-3 sm:px-4">{c.notes || "-"}</td>
                  <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">
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
                  <td colSpan="8" className="py-12 text-center text-gray-400">Aucun certificat médical</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'ajout */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }} onClick={() => setShowModal(false)}>
          <div className="relative w-full max-w-3xl mx-0.5 bg-white rounded-lg shadow-lg border border-blue-100 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none" onClick={() => setShowModal(false)} aria-label="Fermer" type="button">&times;</button>
            <div className="px-4 pt-6 pb-3 bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900">Nouveau certificat médical</h3>
              <p className="text-sm text-gray-500 mt-1">Remplir les informations</p>
            </div>
            <form onSubmit={handleSubmit} className="px-4 py-4 grid grid-cols-1 gap-3 overflow-y-auto max-h-[65vh]">
              <div>
                <label className="text-xs font-semibold text-gray-700">Patient</label>
                <input name="patient" value={form.patient} onChange={handleChange} className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Délivré par</label>
                  <input name="issued_by" value={form.issued_by} onChange={handleChange} className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Date</label>
                  <input type="date" name="issue_date" value={form.issue_date} onChange={handleChange} className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300" required />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Type de certificat</label>
                <input name="certificate_type" value={form.certificate_type} onChange={handleChange} className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Contenu</label>
                <textarea name="content" value={form.content} onChange={handleChange} className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Fichier PDF</label>
                <input type="file" name="file_path" accept="application/pdf" onChange={handleChange} className="mt-1 w-full" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Notes</label>
                <input name="notes" value={form.notes} onChange={handleChange} className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300" />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="px-5 py-2 text-sm font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700 transition">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default MedicalCertificates;
