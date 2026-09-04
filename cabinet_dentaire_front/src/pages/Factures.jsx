import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { invoiceAPI, patientAPI } from '../services/api';

const Factures = () => {
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    search: '',
    patient_id: '',
    date_from: '',
    date_to: '',
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    patient_id: '',
    issue_date: new Date().toISOString().slice(0, 10),
    notes: '',
    items: [], // { dent: '', treatment_name: '', indice: '', amount: '' }
  });

  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);

  const selectedPatient = useMemo(() => {
    return patients.find(p => String(p.id) === String(createForm.patient_id)) || null;
  }, [patients, createForm.patient_id]);

  const filteredPatients = useMemo(() => {
    const term = patientSearchTerm.toLowerCase();
    return patients.filter((p) => {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      return fullName.includes(term) || (p.phone && p.phone.includes(patientSearchTerm));
    });
  }, [patients, patientSearchTerm]);

  useEffect(() => {
    if (selectedPatient) {
      setPatientSearchTerm(`${selectedPatient.first_name} ${selectedPatient.last_name}`);
    }
  }, [selectedPatient]);

  useEffect(() => {
    loadInvoices();
  }, [page, filters.search, filters.patient_id, filters.date_from, filters.date_to]);

  useEffect(() => {
    // Recherche serveur debouncée
    const delayDebounceFn = setTimeout(() => {
      if (patientSearchTerm && showPatientList) {
        searchPatients(patientSearchTerm);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [patientSearchTerm]);

  const loadInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, ...filters };
      const res = await invoiceAPI.getAll(params);
      setInvoices(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
    } catch {
      setInvoices([]);
      setError('Erreur de chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  const searchPatients = async (term) => {
    try {
      const res = await patientAPI.search(term);
      setPatients(res.data?.data || []);
    } catch (error) {
      console.error('Erreur recherche patients:', error);
    }
  };

  const handlePatientChange = async (patientId) => {
    setCreateForm(prev => ({ ...prev, patient_id: patientId, items: [] }));
    if (!patientId) return;

    setLoadingSummaries(true);
    try {
      const res = await patientAPI.getTreatmentSummaries(patientId);
      const summaries = res.data || [];
      
      const defaultItems = summaries.map(s => ({
        dent: '',
        treatment_name: s.name,
        indice: '',
        amount: String(s.total_collected || 0),
        is_completed: s.status === 'completed'
      }));
      setCreateForm(prev => ({ ...prev, items: defaultItems }));
    } catch (error) {
      console.error('Erreur chargement résumés:', error);
    } finally {
      setLoadingSummaries(false);
    }
  };

  const addItem = () => {
    setCreateForm(prev => ({
      ...prev,
      items: [...prev.items, { dent: '', treatment_name: '', indice: '', amount: '0' }]
    }));
  };

  const removeItem = (index) => {
    setCreateForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setCreateForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const totalCalculated = useMemo(() => {
    return createForm.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [createForm.items]);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!createForm.patient_id || createForm.items.length === 0) {
      alert('Sélectionnez un patient et ajoutez au moins une ligne.');
      return;
    }

    setSaving(true);
    try {
      const response = await invoiceAPI.create({
        patient_id: Number(createForm.patient_id),
        issue_date: createForm.issue_date,
        notes: createForm.notes || null,
        items: createForm.items.map(it => ({
          dent: it.dent ? Number(it.dent) : null,
          treatment_name: it.treatment_name,
          indice: it.indice,
          amount: Number(it.amount)
        })),
      });

      if (response && response.status === 201) {
        closeCreateModal();
        await loadInvoices();
      }
    } catch (err) {
      console.error('Erreur lors de la création de facture:', err);
      const msg = err?.response?.data?.message || 'Erreur lors de la création de la facture. Veuillez vérifier votre connexion.';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCreateForm({
      patient_id: '',
      issue_date: new Date().toISOString().slice(0, 10),
      notes: '',
      items: [],
    });
    setPatientSearchTerm('');
    setShowPatientList(false);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetForm();
  };

  const downloadPdf = async (invoice) => {
    setPdfLoadingId(invoice.id);
    try {
      const res = await invoiceAPI.generate(invoice.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Erreur lors de la génération du PDF');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const clearFilters = () => {
    setFilters({
      patient_id: '',
      search: '',
      date_from: '',
      date_to: '',
    });
    setPage(1);
  };

  return (
    <Layout>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Factures</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Gérez les synthèses financières des patients</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-lg bg-linear-to-br from-white/80 via-blue-50/60 to-white/90 backdrop-blur-sm transition-all duration-300 group hover:shadow-2xl hover:border-blue-200">
        <div className="px-4 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Liste des factures</h2>
            <p className="text-gray-500 text-sm mt-1">Recherche, création et génération PDF</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-blue-600 text-sm font-medium rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer select-none border border-blue-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle facture
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-200 grid grid-cols-1 md:grid-cols-5 gap-2">
          <div className="md:col-span-2 relative">
            <input
              type="text"
              placeholder="Rechercher patient ou numéro..."
              className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
              value={filters.search}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, search: e.target.value }));
              }}
            />
            <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.35-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
            value={filters.patient_id}
            onChange={(e) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, patient_id: e.target.value }));
            }}
          >
            <option value="">Tous les patients</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
            value={filters.date_from}
            onChange={(e) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, date_from: e.target.value }));
            }}
          />

          <input
            type="date"
            className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
            value={filters.date_to}
            onChange={(e) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, date_to: e.target.value }));
            }}
          />

          <div className="md:col-span-5 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-100"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>

        {error && <div className="px-4 py-2 text-red-600 text-sm">{error}</div>}

        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="p-6 text-gray-600 font-medium italic animate-pulse">Chargement des factures...</div>
          ) : (
            <table className="min-w-150 w-full text-xs sm:text-sm md:text-base">
              <thead>
                <tr>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Numéro</th>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Patient</th>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="text-right py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Total</th>
                  <th className="text-center py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">Aucune facture trouvée</td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-blue-50 transition-colors duration-150 group">
                      <td className="py-2 px-2 sm:py-3 sm:px-4 font-bold text-blue-600 whitespace-nowrap">{inv.invoice_number}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 font-medium text-gray-900 whitespace-nowrap">{inv.patient ? `${inv.patient.first_name} ${inv.patient.last_name}` : '-'}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap text-gray-500">{new Date(inv.issue_date).toLocaleDateString('fr-FR')}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-right font-bold text-slate-700 whitespace-nowrap">{Number(inv.total_amount).toLocaleString()} XOF</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => downloadPdf(inv)}
                            disabled={pdfLoadingId === inv.id}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all"
                            title="Télécharger PDF"
                          >
                            {pdfLoadingId === inv.id ? (
                               <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination style Patients */}
        {totalPages > 1 && (
          <div className="px-8 py-4 border-t border-blue-100 flex items-center justify-between mt-2">
            <p className="text-gray-500 text-sm">
              Page {page} sur {totalPages} | Affichage de {invoices.length} facture{invoices.length !== 1 ? 's' : ''}
            </p>
            <div className="flex space-x-2">
              <button
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                ← Précédent
              </button>
              <button
                className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 hover:shadow-md rounded-lg transition-all duration-200 flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <span>Suivant</span>
                <svg className="w-4 h-4 text-blue-500 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de création (Conformité Ordonnances/Certificats) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }} onClick={closeCreateModal}>
          <div className="relative w-full max-w-5xl mx-0.5 bg-white rounded-lg shadow-lg border border-blue-100 max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none" onClick={closeCreateModal} aria-label="Fermer" type="button">&times;</button>
            
            <div className="px-4 pt-6 pb-3 bg-linear-to-r from-blue-50 via-white to-blue-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900">Nouvelle facture</h3>
              <p className="text-sm text-gray-500 mt-1">Saisie des soins et montants encaissés</p>
              
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="font-semibold text-gray-700 uppercase tracking-tight">Patient sélectionné :</span>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 font-bold text-blue-700 shadow-xs">
                  {selectedPatient ? `${selectedPatient.first_name || ''} ${selectedPatient.last_name || ''}`.trim() : (createForm.patient_id ? `ID ${createForm.patient_id}` : 'Aucun')}
                </span>
              </div>
            </div>

            <form onSubmit={handleCreateInvoice} className="px-4 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Patient *</label>
                  <input
                    type="text"
                    required
                    placeholder="Rechercher un patient..."
                    className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300 font-medium"
                    value={patientSearchTerm}
                    onChange={(e) => {
                      setPatientSearchTerm(e.target.value);
                      setShowPatientList(true);
                    }}
                    onFocus={() => setShowPatientList(true)}
                  />

                  {showPatientList && patientSearchTerm && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-20">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              handlePatientChange(p.id);
                              setPatientSearchTerm(`${p.first_name || ''} ${p.last_name || ''}`.trim());
                              setShowPatientList(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <p className="font-bold text-slate-900">{p.first_name} {p.last_name}</p>
                            {p.phone && <p className="text-xs text-slate-500 mt-0.5">{p.phone}</p>}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 italic">Aucun patient trouvé</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Date d'émission</label>
                  <input
                    required
                    type="date"
                    className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300 font-medium"
                    value={createForm.issue_date}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, issue_date: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Notes générales</label>
                  <input
                    type="text"
                    placeholder="Notes (optionnel)"
                    className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300 font-medium"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Lignes de soins</h4>
                  {loadingSummaries && <span className="text-[10px] font-medium text-blue-500 animate-pulse italic">Récupération des encaissements...</span>}
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden bg-slate-50/30">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase">
                        <th className="px-4 py-2 w-16 text-center">Dent</th>
                        <th className="px-4 py-2 text-left">Traitement / Soin</th>
                        <th className="px-4 py-2 w-24 text-center">Indice</th>
                        <th className="px-4 py-2 w-32 text-right">Montant</th>
                        <th className="px-2 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {createForm.items.map((item, index) => (
                        <tr key={index} className="group hover:bg-blue-50/20 transition-colors">
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              placeholder="-"
                              className="w-full px-1 py-1 text-center bg-gray-50/50 rounded border-none text-xs focus:ring-1 focus:ring-blue-300 font-bold text-blue-600"
                              value={item.dent}
                              onChange={e => updateItem(index, 'dent', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex flex-col">
                              <input
                                required
                                type="text"
                                placeholder="Désignation du soin"
                                className="w-full py-1 bg-transparent border-none text-xs font-medium focus:ring-0 placeholder:text-gray-300"
                                value={item.treatment_name}
                                onChange={e => updateItem(index, 'treatment_name', e.target.value)}
                              />
                              {item.is_completed === false && (
                                <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter leading-none mt-0.5">
                                  ● Traitement en cours
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              placeholder="Code"
                              className="w-full px-1 py-1 text-center bg-gray-50/50 rounded border-none text-xs focus:ring-1 focus:ring-blue-300 text-gray-500"
                              value={item.indice}
                              onChange={e => updateItem(index, 'indice', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              required
                              type="number"
                              className="w-full py-1 text-right bg-transparent border-none text-xs font-bold text-slate-800 focus:ring-0"
                              value={item.amount}
                              onChange={e => updateItem(index, 'amount', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-1 text-red-200 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    onClick={addItem}
                    className="w-full py-2.5 bg-gray-50/50 hover:bg-blue-50 text-[10px] font-bold text-gray-400 hover:text-blue-600 transition-all uppercase tracking-widest border-t border-gray-100"
                  >
                    + Ajouter une ligne personnalisée
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-end justify-between pt-2">
                <div className="w-full max-w-sm">
                  <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Montant Total Facturé</p>
                    <p className="text-2xl font-black text-blue-700">{totalCalculated.toLocaleString()} <span className="text-xs font-bold">XOF</span></p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-6 py-2.5 text-sm font-bold rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
                    onClick={closeCreateModal}
                  >
                    Annuler
                  </button>
                  <button
                    disabled={saving || !createForm.patient_id || createForm.items.length === 0}
                    type="submit"
                    className="px-8 py-2.5 text-sm font-bold rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle><path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2z"></path></svg>
                        Enregistrement...
                      </>
                    ) : 'Enregistrer la facture'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Factures;
