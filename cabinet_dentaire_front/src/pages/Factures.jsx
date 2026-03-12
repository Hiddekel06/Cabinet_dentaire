import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { invoiceAPI, patientAPI } from '../services/api';

const Factures = () => {
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [billableActs, setBillableActs] = useState([]);
  const [selectedActs, setSelectedActs] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    search: '',
    patient_id: '',
    status: '',
    date_from: '',
    date_to: '',
  });

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    patient_id: '',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  useEffect(() => {
    loadInvoices();
  }, [page, filters.search, filters.patient_id, filters.status, filters.date_from, filters.date_to]);

  useEffect(() => {
    loadPatientsOnDemand();
  }, []);

  const buildInvoiceParams = () => {
    const params = { page };
    if (filters.search) params.search = filters.search.trim();
    if (filters.patient_id) params.patient_id = filters.patient_id;
    if (filters.status) params.status = filters.status;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    return params;
  };

  const loadInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await invoiceAPI.getAll(buildInvoiceParams());
      setInvoices(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
    } catch {
      setInvoices([]);
      setTotalPages(1);
      setError('Erreur de chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientsOnDemand = async () => {
    if (patients.length > 0) return;
    try {
      const res = await patientAPI.getAll(1);
      setPatients(res.data?.data || []);
    } catch {
      setPatients([]);
    }
  };

  const loadBillableActs = async (patientId) => {
    if (!patientId) {
      setBillableActs([]);
      setSelectedActs({});
      return;
    }

    try {
      const res = await invoiceAPI.getBillableActs(patientId);
      const acts = res.data?.billable_acts || [];
      setBillableActs(acts);
      setSelectedActs({});
    } catch {
      setBillableActs([]);
      setSelectedActs({});
    }
  };

  const selectedTotal = useMemo(() => {
    return billableActs.reduce((sum, act) => {
      if (!selectedActs[act.id]) return sum;
      return sum + (Number(act.subtotal) || 0);
    }, 0);
  }, [billableActs, selectedActs]);

  const toggleAct = (actId) => {
    setSelectedActs((prev) => ({ ...prev, [actId]: !prev[actId] }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      patient_id: '',
      status: '',
      date_from: '',
      date_to: '',
    });
    setPage(1);
  };

  const openInvoiceDetail = async (invoiceId) => {
    setShowDetailModal(true);
    setDetailLoading(true);
    setSelectedInvoice(null);
    try {
      const res = await invoiceAPI.getById(invoiceId);
      setSelectedInvoice(res.data || null);
    } catch {
      setSelectedInvoice(null);
      alert('Impossible de charger le detail de la facture');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm({
      patient_id: '',
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setBillableActs([]);
    setSelectedActs({});
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();

    const items = Object.entries(selectedActs)
      .filter(([, selected]) => selected)
      .map(([id]) => ({ patient_treatment_act_id: Number(id) }));

    if (!createForm.patient_id || items.length === 0) {
      alert('Selectionnez un patient et au moins un acte a facturer');
      return;
    }

    setSaving(true);
    try {
      await invoiceAPI.create({
        patient_id: Number(createForm.patient_id),
        issue_date: createForm.issue_date,
        due_date: createForm.due_date,
        notes: createForm.notes || null,
        items,
      });

      closeCreateModal();
      setPage(1);
      await loadInvoices();
    } catch (err) {
      const message = err?.response?.data?.message || 'Erreur lors de la creation de la facture';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
          <p className="text-gray-600 mt-1">Liste et creation de factures patient</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            loadPatientsOnDemand();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-blue-600 text-sm font-medium rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100"
        >
          Nouvelle facture
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-lg bg-linear-to-br from-white/80 via-blue-50/60 to-white/90 backdrop-blur-sm">
        <div className="px-4 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Liste des factures</h2>
        </div>

        <div className="px-4 pt-4 pb-2 border-b border-gray-100 bg-white/80">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <div className="md:col-span-2 relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, search: e.target.value }));
                }}
                placeholder="Rechercher (numero, nom, telephone)"
                className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
              />
              <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.35-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <select
              value={filters.patient_id}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, patient_id: e.target.value }));
              }}
              className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
            >
              <option value="">Tous les patients</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, status: e.target.value }));
              }}
              className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">pending</option>
              <option value="partial">partial</option>
              <option value="paid">paid</option>
              <option value="cancelled">cancelled</option>
            </select>

            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, date_from: e.target.value }));
              }}
              className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
            />

            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, date_to: e.target.value }));
              }}
              className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
            />
          </div>

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-100"
            >
              Reinitialiser les filtres
            </button>
          </div>
        </div>

        {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}

        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="p-6 text-gray-600">Chargement...</div>
          ) : (
            <table className="min-w-150 w-full text-xs sm:text-sm md:text-base">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Numero</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Patient</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Total</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Paye</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Statut</th>
                  <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">Aucune facture</td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-blue-50 transition-colors duration-150">
                      <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">{inv.invoice_number}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{inv.patient ? `${inv.patient.first_name || ''} ${inv.patient.last_name || ''}`.trim() : '-'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{inv.issue_date}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{inv.total_amount}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{inv.paid_amount}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{inv.status}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openInvoiceDetail(inv.id)}
                          className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100"
                        >
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Precedent
            </button>
            <span className="text-sm text-gray-600">Page {page} sur {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }}
          onClick={closeCreateModal}
        >
          <div className="relative w-full max-w-4xl mx-2 bg-white rounded-lg shadow-lg border border-blue-100 max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={closeCreateModal}
              aria-label="Fermer"
              type="button"
            >
              &times;
            </button>

            <div className="px-4 pt-6 pb-3 bg-linear-to-r from-blue-50 via-white to-blue-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900">Nouvelle facture</h3>
              <p className="text-sm text-gray-500 mt-1">Selectionner un patient puis des actes a facturer</p>
            </div>

            <form onSubmit={handleCreateInvoice} className="px-4 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  required
                  value={createForm.patient_id}
                  onChange={(e) => {
                    const patientId = e.target.value;
                    setCreateForm((prev) => ({ ...prev, patient_id: patientId }));
                    loadBillableActs(patientId);
                  }}
                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                >
                  <option value="">Selectionner un patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </select>

                <input
                  required
                  type="date"
                  value={createForm.issue_date}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, issue_date: e.target.value }))}
                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                />

                <input
                  required
                  type="date"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, due_date: e.target.value }))}
                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                />
              </div>

              <textarea
                rows={2}
                value={createForm.notes}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes de facture (optionnel)"
                className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
              />

              <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Actes facturables</h4>
                  <span className="text-sm font-semibold text-blue-700">Total selectionne: {selectedTotal.toFixed(2)}</span>
                </div>

                {billableActs.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun acte facturable pour ce patient.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {billableActs.map((act) => (
                      <label key={act.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:bg-blue-50">
                        <input
                          type="checkbox"
                          checked={!!selectedActs[act.id]}
                          onChange={() => toggleAct(act.id)}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {(act.dental_act_code ? `${act.dental_act_code} - ` : '') + (act.dental_act_name || 'Acte')}
                          </div>
                          <div className="text-xs text-gray-500">
                            Suivi: {act.patient_treatment_name || '-'} | Qte: {act.quantity} | PU: {act.unit_price}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-800">{Number(act.subtotal || 0).toFixed(2)}</div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-5 py-2 text-sm font-semibold rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  disabled={saving}
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Creation...' : 'Creer la facture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }}
          onClick={() => setShowDetailModal(false)}
        >
          <div className="relative w-full max-w-4xl mx-2 bg-white rounded-lg shadow-lg border border-blue-100 max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setShowDetailModal(false)}
              aria-label="Fermer"
              type="button"
            >
              &times;
            </button>

            <div className="px-4 pt-6 pb-3 bg-linear-to-r from-blue-50 via-white to-blue-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900">Detail facture</h3>
            </div>

            <div className="px-4 py-4 overflow-y-auto max-h-[70vh]">
              {detailLoading ? (
                <div className="text-gray-600">Chargement du detail...</div>
              ) : !selectedInvoice ? (
                <div className="text-gray-600">Facture introuvable.</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Numero:</span> <span className="font-semibold">{selectedInvoice.invoice_number}</span></div>
                    <div><span className="text-gray-500">Statut:</span> <span className="font-semibold">{selectedInvoice.status}</span></div>
                    <div><span className="text-gray-500">Patient:</span> <span className="font-semibold">{selectedInvoice.patient ? `${selectedInvoice.patient.first_name || ''} ${selectedInvoice.patient.last_name || ''}`.trim() : '-'}</span></div>
                    <div><span className="text-gray-500">Date:</span> <span className="font-semibold">{selectedInvoice.issue_date}</span></div>
                    <div><span className="text-gray-500">Total:</span> <span className="font-semibold">{selectedInvoice.total_amount}</span></div>
                    <div><span className="text-gray-500">Paye:</span> <span className="font-semibold">{selectedInvoice.paid_amount}</span></div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Lignes facture</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left py-2 px-2">Acte</th>
                            <th className="text-left py-2 px-2">Qte</th>
                            <th className="text-left py-2 px-2">PU</th>
                            <th className="text-left py-2 px-2">Sous-total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedInvoice.items || []).map((item) => {
                            const act = item.patient_treatment_act;
                            const dental = act?.dental_act;
                            const label = [dental?.code, dental?.nom].filter(Boolean).join(' - ') || 'Acte';
                            return (
                              <tr key={item.id} className="border-t border-gray-100">
                                <td className="py-2 px-2">{label}</td>
                                <td className="py-2 px-2">{item.quantity}</td>
                                <td className="py-2 px-2">{item.unit_price}</td>
                                <td className="py-2 px-2 font-semibold">{item.subtotal}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {selectedInvoice.notes && (
                    <div className="text-sm text-gray-700 rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <span className="font-semibold">Notes:</span> {selectedInvoice.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Factures;
