import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { patientAPI, sessionReceiptAPI } from '../services/api';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('fr-FR');
};

const getPatientName = (patient) => {
  if (!patient) return 'Patient';
  return `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient';
};

const SessionReceipts = () => {
  const navigate = useNavigate();

  const [receipts, setReceipts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    patient_id: '',
    search: '',
    status: '',
    period: 'today', // Par défaut sur aujourd'hui
  });

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

  const loadReceipts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        per_page: 20,
      };

      if (filters.patient_id) {
        params.patient_id = filters.patient_id;
      }
      if (filters.status) {
        params.status = filters.status;
      }

      const res = await sessionReceiptAPI.getAll(params);
      setReceipts(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
    } catch {
      setReceipts([]);
      setTotalPages(1);
      setError('Impossible de charger les reçus de séance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [page, filters.patient_id, filters.status]);

  const filteredReceipts = useMemo(() => {
    let result = [...receipts];

    // 1. Filtrage par période
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    if (filters.period === 'today') {
      result = result.filter(r => new Date(r.issue_date).getTime() === today);
    } else if (filters.period === 'week') {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))).setHours(0, 0, 0, 0);
      result = result.filter(r => new Date(r.issue_date).getTime() >= startOfWeek);
    } else if (filters.period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      result = result.filter(r => new Date(r.issue_date).getTime() >= startOfMonth);
    } else if (filters.period === 'last_2_months') {
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
      result = result.filter(r => new Date(r.issue_date).getTime() >= twoMonthsAgo);
    }

    // 2. Recherche textuelle
    const term = filters.search.trim().toLowerCase();
    if (term) {
      result = result.filter((receipt) => {
        const receiptNumber = String(receipt.receipt_number || '').toLowerCase();
        const patientName = getPatientName(receipt.patient).toLowerCase();
        return receiptNumber.includes(term) || patientName.includes(term);
      });
    }

    return result;
  }, [receipts, filters.search, filters.period]);

  const totalCollected = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + (Number(r.medical_record?.amount_collected || r.total_amount || 0)), 0);
  }, [filteredReceipts]);

  const periodLabel = useMemo(() => {
    return periods.find(p => p.value === filters.period)?.label || 'Période';
  }, [filters.period]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reçus de séance</h1>
            <p className="text-gray-600 mt-1">Historique complet des reçus générés, consultables et téléchargeables à tout moment.</p>
          </div>
          {!loading && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-tight">Total encaissé<br/>({periodLabel})</p>
                <p className="text-xl font-black text-emerald-700">{totalCollected.toLocaleString()} XOF</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Rechercher (réf, patient...)"
                className="w-full rounded-lg border border-gray-300 pl-3 pr-8 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
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
              className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

          {loading ? (
            <p className="text-sm text-gray-500">Chargement...</p>
          ) : filteredReceipts.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun reçu trouvé.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b border-gray-200">
                    <th className="py-2 pr-3">Référence</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Patient</th>
                    <th className="py-2 pr-3">Traitement</th>
                    <th className="py-2 pr-3">Séance</th>
                    <th className="py-2 pr-3">Total</th>
                    <th className="py-2 pr-3">Montant encaissé</th>
                    <th className="py-2 pr-3">Statut</th>
                    <th className="py-2 pr-3">Téléchargements</th>
                    <th className="py-2 pr-3">Dernier téléchargement</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.map((receipt) => (
                    <tr key={receipt.id} className="border-b border-gray-100">
                      <td className="py-2 pr-3 font-medium text-gray-900">{receipt.receipt_number || `REC-${receipt.id}`}</td>
                      <td className="py-2 pr-3">{formatDate(receipt.issue_date)}</td>
                      <td className="py-2 pr-3">{getPatientName(receipt.patient)}</td>
                      <td className="py-2 pr-3">{receipt.patient_treatment_id ? `#${receipt.patient_treatment_id}` : '-'}</td>
                      <td className="py-2 pr-3">#{receipt.medical_record_id}</td>
                      <td className="py-2 pr-3">{Number(receipt.total_amount || 0).toLocaleString('fr-FR')} FCFA</td>
                      <td className="py-2 pr-3 text-green-600 font-semibold">{receipt.medical_record?.amount_collected ? `${Number(receipt.medical_record.amount_collected).toLocaleString('fr-FR')} XOF` : '–'}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${receipt.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {receipt.status === 'paid' ? 'Payé' : 'Non payé'}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{Number(receipt.downloads_count || 0)}</td>
                      <td className="py-2 pr-3">{formatDateTime(receipt.last_downloaded_at)}</td>
                      <td className="py-2 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(receipt)}
                          disabled={downloadingReceiptId === receipt.id}
                          className="px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                        >
                          {downloadingReceiptId === receipt.id ? 'Téléchargement...' : 'Télécharger'}
                        </button>
                        {receipt.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm('Marquer ce reçu comme payé ?')) return;
                              try {
                                const res = await sessionReceiptAPI.markAsPaid(receipt.id);
                                setReceipts((prev) => prev.map((item) => (item.id === receipt.id ? { ...item, ...res.data } : item)));
                              } catch {
                                alert('Impossible de marquer le reçu comme payé.');
                              }
                            }}
                            className="px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          >
                            Marquer payé
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/patients/${receipt.patient_id}/dossier`)}
                          className="px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">Page {page} / {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SessionReceipts;
