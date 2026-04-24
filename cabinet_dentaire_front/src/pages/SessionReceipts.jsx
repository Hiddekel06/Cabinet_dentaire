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
  });

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
    const term = filters.search.trim().toLowerCase();
    if (!term) return receipts;

    return receipts.filter((receipt) => {
      const receiptNumber = String(receipt.receipt_number || '').toLowerCase();
      const patientName = getPatientName(receipt.patient).toLowerCase();
      const sessionLabel = String(receipt.medical_record_id || '');
      return receiptNumber.includes(term) || patientName.includes(term) || sessionLabel.includes(term);
    });
  }, [receipts, filters.search]);

  const handleDownload = async (receipt) => {
    if (!receipt?.id) return;

    setDownloadingReceiptId(receipt.id);
    try {
      const res = await sessionReceiptAPI.generate(receipt.id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recu_seance_${receipt.receipt_number || receipt.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      const nowIso = new Date().toISOString();
      setReceipts((prev) =>
        prev.map((item) => {
          if (item.id !== receipt.id) return item;
          return {
            ...item,
            downloads_count: Number(item.downloads_count || 0) + 1,
            last_downloaded_at: nowIso,
          };
        })
      );
    } catch {
      alert('Impossible de télécharger le reçu.');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reçus de séance</h1>
          <p className="text-gray-600 mt-1">Historique complet des reçus générés, consultables et téléchargeables à tout moment.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Rechercher (référence, patient, séance)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setFilters({ patient_id: '', search: '', status: '' });
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                Réinitialiser
              </button>
            </div>
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
