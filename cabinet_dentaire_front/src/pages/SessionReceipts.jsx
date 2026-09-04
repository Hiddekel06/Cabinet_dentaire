import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { patientAPI, sessionReceiptAPI, medicalRecordAPI } from '../services/api';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
};

const getPatientName = (patient) => {
  if (!patient) return 'Patient';
  return `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient';
};

const SessionReceipts = () => {
  const navigate = useNavigate();

  // États principaux
  const [receipts, setReceipts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [globalTotalFromAPI, setGlobalTotalFromAPI] = useState(0);

  // Filtres
  const [filters, setFilters] = useState({
    patient_id: '',
    search: '',
    status: '',
    period: 'today',
  });

  // États pour le reçu manuel
  const [showManualModal, setShowManualModal] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  const [selectedPatientForManual, setSelectedPatientForManual] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualDesignation, setManualDesignation] = useState('');

  const periods = [
    { label: 'Aujourd\'hui', value: 'today' },
    { label: 'Cette semaine', value: 'week' },
    { label: 'Ce mois-ci', value: 'month' },
    { label: '2 derniers mois', value: 'last_2_months' },
    { label: 'Tout l\'historique', value: 'all' },
  ];

  const loadPatients = async () => {
    try {
      const res = await patientAPI.getAll(1, { per_page: 500 });
      setPatients(res.data?.data || res.data || []);
    } catch {
      setPatients([]);
    }
  };

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Si une recherche est en cours, on élargit la période à 'all' si elle était à 'today'
      // pour éviter de masquer des résultats pertinents.
      const currentPeriod = (filters.search && filters.period === 'today') ? 'all' : filters.period;

      const params = {
        page,
        per_page: 15,
        search: filters.search,
        period: currentPeriod,
        patient_id: filters.patient_id,
        status: filters.status
      };

      const res = await sessionReceiptAPI.getAll(params);
      setReceipts(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
      setGlobalTotalFromAPI(res.data?.global_total_sum || 0);
    } catch (err) {
      console.error('Erreur chargement reçus:', err);
      setReceipts([]);
      setError('Impossible de charger les reçus de séance.');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleDownload = async (receipt) => {
    setDownloadingReceiptId(receipt.id);
    try {
      const response = await sessionReceiptAPI.generate(receipt.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recu_${receipt.receipt_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Erreur téléchargement reçu:', err);
      alert('Erreur lors de la génération du PDF.');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const handleDelete = async (receiptId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce reçu ? Cette action est irréversible et mettra à jour le montant collecté du patient.')) {
      return;
    }

    try {
      await sessionReceiptAPI.delete(receiptId);
      loadReceipts();
    } catch (err) {
      console.error('Erreur suppression reçu:', err);
      alert('Erreur lors de la suppression du reçu.');
    }
  };

  const filteredPatients = useMemo(() => {
    const term = patientSearchTerm.toLowerCase().trim();
    if (!term) return [];
    return patients.filter((p) => {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      return fullName.includes(term) || (p.phone && p.phone.includes(term));
    });
  }, [patients, patientSearchTerm]);

  const handleSelectPatientManual = async (patient) => {
    setSelectedPatientForManual(patient);
    setPatientSearchTerm(`${patient.first_name} ${patient.last_name}`);
    setShowPatientList(false);
    setLoadingRecords(true);
    setSelectedRecordId(null);
    setManualDesignation('');
    try {
      const recordsRes = await medicalRecordAPI.getAll({ patient_id: patient.id });
      setPatientRecords(recordsRes.data?.data || recordsRes.data || []);
    } catch (err) {
      console.error('Erreur chargement séances:', err);
      setPatientRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleCreateManualReceipt = async () => {
    if (!selectedPatientForManual || !manualAmount || Number(manualAmount) <= 0) {
      alert('Veuillez sélectionner un patient et saisir un montant valide.');
      return;
    }

    setSavingManual(true);
    try {
      await sessionReceiptAPI.create({
        patient_id: selectedPatientForManual.id,
        medical_record_id: selectedRecordId,
        amount_collected: Number(manualAmount),
        issue_date: manualDate,
        notes: manualDesignation || null
      });
      setShowManualModal(false);
      resetManualForm();
      loadReceipts();
    } catch (err) {
      console.error('Erreur création reçu manuel:', err);
      alert('Erreur lors de la création du reçu.');
    } finally {
      setSavingManual(false);
    }
  };

  const resetManualForm = () => {
    setSelectedPatientForManual(null);
    setPatientSearchTerm('');
    setPatientRecords([]);
    setManualAmount('');
    setSelectedRecordId(null);
    setManualDate(new Date().toISOString().slice(0, 10));
    setManualDesignation('');
  };

  // Variable de rendu pour éviter les ReferenceError
  const filteredReceipts = receipts;

  const totalCollected = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + (Number(r.total_amount || 0)), 0);
  }, [filteredReceipts]);

  const periodLabel = useMemo(() => {
    return periods.find(p => p.value === filters.period)?.label || 'Période';
  }, [filters.period]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reçus de séance</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Historique complet des reçus générés, consultables et téléchargeables à tout moment.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => setShowManualModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau reçu manuel
            </button>

            {!loading && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-tight">Total encaissé<br/>({periodLabel})</p>
                  <p className="text-xl font-black text-blue-700">{globalTotalFromAPI.toLocaleString()} XOF</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Rechercher (réf, patient...)"
                className="w-full rounded-lg border border-gray-300 pl-3 pr-8 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.period}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, period: e.target.value }));
              }}
            >
              {periods.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.patient_id}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, patient_id: e.target.value }));
              }}
            >
              <option value="">Tous les patients</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {getPatientName(patient)}
                </option>
              ))}
            </select>

            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.status}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, status: e.target.value }));
              }}
            >
              <option value="">Tous les statuts</option>
              <option value="pending">Non payé</option>
              <option value="paid">Payé</option>
            </select>
          </div>
          
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setFilters({ patient_id: '', search: '', status: '', period: 'today' });
              }}
              className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

          {loading ? (
            <div className="p-6 text-blue-600 font-medium italic animate-pulse">Chargement des reçus...</div>
          ) : filteredReceipts.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun reçu trouvé.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b border-gray-200">
                    <th className="py-3 px-3">Référence</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Patient</th>
                    <th className="py-3 px-3">Séance</th>
                    <th className="py-3 px-3 text-right">Montant encaissé</th>
                    <th className="py-3 px-3 text-center">Statut</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReceipts.map((receipt) => (
                    <tr key={receipt.id} className="hover:bg-blue-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-blue-600">{receipt.receipt_number || `REC-${receipt.id}`}</td>
                      <td className="py-3 px-3 text-gray-500">{formatDate(receipt.issue_date)}</td>
                      <td className="py-3 px-3 font-medium text-gray-900">{getPatientName(receipt.patient)}</td>
                      <td className="py-3 px-3 text-gray-400">#{receipt.medical_record_id || 'Libre'}</td>
                      <td className="py-3 px-3 text-right font-black text-green-600">{Number(receipt.total_amount || 0).toLocaleString('fr-FR')} XOF</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${receipt.status === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                          {receipt.status === 'paid' ? 'Payé' : 'Non payé'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDownload(receipt)}
                            disabled={downloadingReceiptId === receipt.id}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all"
                            title="Télécharger PDF"
                          >
                            {downloadingReceiptId === receipt.id ? (
                               <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                            )}
                          </button>
                          <button
                            onClick={() => navigate(`/patients/${receipt.patient_id}/dossier`)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Voir dossier"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" /></svg>
                          </button>
                          <button
                            onClick={() => handleDelete(receipt.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                            title="Supprimer le reçu"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-blue-50 pt-4">
              <p className="text-xs text-gray-500 font-medium">Page {page} sur {totalPages} | Affichage de {filteredReceipts.length} reçu{filteredReceipts.length !== 1 ? 's' : ''}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-bold text-gray-700 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Précédent
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-bold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 hover:shadow-md rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Reçu Manuel - Style Factures */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => { setShowManualModal(false); resetManualForm(); }}>
          <div className="relative w-full max-w-5xl bg-white rounded-lg shadow-lg border border-blue-100 max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none" onClick={() => { setShowManualModal(false); resetManualForm(); }} aria-label="Fermer" type="button">&times;</button>
            
            <div className="px-4 pt-6 pb-3 bg-linear-to-r from-blue-50 via-white to-blue-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900">Encaisser un versement</h3>
              <p className="text-sm text-gray-500 mt-1">Générez un reçu pour une séance passée ou un encaissement libre</p>
              
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="font-semibold text-gray-700 uppercase tracking-tight">Patient sélectionné :</span>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 font-bold text-blue-700 shadow-xs">
                  {selectedPatientForManual ? `${selectedPatientForManual.first_name || ''} ${selectedPatientForManual.last_name || ''}`.trim() : 'Aucun'}
                </span>
              </div>
            </div>

            <div className="px-4 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Ligne : Recherche Patient et Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Patient *</label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      required
                      placeholder="Rechercher un patient..."
                      className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300 font-medium transition-all"
                      value={patientSearchTerm}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setShowPatientList(true);
                        setSelectedPatientForManual(null);
                      }}
                      onFocus={() => setShowPatientList(true)}
                    />
                    {showPatientList && patientSearchTerm && !selectedPatientForManual && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-20">
                        {filteredPatients.length > 0 ? (
                          filteredPatients.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectPatientManual(p)}
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
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Date du reçu</label>
                  <div className="mt-1">
                    <input
                      type="date"
                      className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 border border-transparent focus:border-blue-300 font-medium outline-none"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Désignation (Libre) */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Libellé du soin / Motif (apparaîtra sur le reçu)</label>
                <div className="mt-1">
                  <input
                    type="text"
                    placeholder="Ex: Consultation, Avance sur prothèse..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    value={manualDesignation}
                    onChange={(e) => setManualDesignation(e.target.value)}
                  />
                </div>
              </div>

              {selectedPatientForManual && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  {/* Liste des séances */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Associer à une séance (Optionnel)</h4>
                      {loadingRecords && <span className="text-[10px] font-medium text-blue-500 animate-pulse italic">Chargement...</span>}
                    </div>

                    <div className="border border-gray-100 rounded-xl overflow-hidden bg-slate-50/30">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase">
                            <th className="px-4 py-2 text-left">Date</th>
                            <th className="px-4 py-2 text-left">Soin réalisé</th>
                            <th className="px-4 py-2 text-right">Déjà récolté</th>
                            <th className="px-4 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {patientRecords.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 italic">Aucune séance trouvée</td></tr>
                          ) : (
                            patientRecords.map((record) => (
                              <tr
                                key={record.id}
                                onClick={() => {
                                  setSelectedRecordId(record.id);
                                  setManualDesignation(record.treatment_performed || '');
                                }}
                                className={`group cursor-pointer transition-colors ${selectedRecordId === record.id ? 'bg-blue-50/50' : 'hover:bg-blue-50/20'}`}
                              >
                                <td className="px-4 py-2.5 text-xs font-medium text-gray-500">{formatDate(record.date)}</td>
                                <td className="px-4 py-2.5">
                                  <p className="text-xs font-bold text-slate-800">{record.treatment_performed || 'Soin non spécifié'}</p>
                                </td>
                                <td className="px-4 py-2.5 text-right font-black text-blue-600 text-xs">
                                  {Number(record.amount_collected || 0).toLocaleString()} <span className="text-[8px] opacity-60">XOF</span>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <div className={`w-4 h-4 rounded-full border mx-auto flex items-center justify-center transition-all ${selectedRecordId === record.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                                    {selectedRecordId === record.id && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Saisie du montant et Validation - Style Simple (Inspiré StartTreatment) */}
                  <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div className="flex-1 w-full sm:max-w-xs">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Montant à encaisser *</label>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="0"
                            className="w-full rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-white px-4 py-3 pr-16 text-xl font-extrabold text-emerald-800 shadow-sm outline-none transition-all placeholder:text-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                            value={manualAmount}
                            onChange={(e) => setManualAmount(e.target.value)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">XOF</span>
                        </div>
                      </div>

                      <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                        <button
                          type="button"
                          className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                          onClick={() => { setShowManualModal(false); resetManualForm(); }}
                        >
                          Annuler
                        </button>
                        <button
                          disabled={savingManual || !selectedPatientForManual || !manualAmount}
                          onClick={handleCreateManualReceipt}
                          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-100 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingManual ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle><path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2z"></path></svg>
                              <span>Envoi...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              <span>Valider le montant encaissé</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SessionReceipts;
