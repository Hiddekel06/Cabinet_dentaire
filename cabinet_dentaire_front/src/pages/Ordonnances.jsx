import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { ordonnanceAPI, medicationAPI, patientAPI } from '../services/api';

const emptyItem = { medication_id: '', medication_name: '', frequency: '', duration: '', instructions: '' };

const Ordonnances = () => {
  const [ordonnances, setOrdonnances] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({
    patient_id: '',
    search: '',
    date_from: '',
    date_to: '',
  });

  const [form, setForm] = useState({
    patient_id: '',
    issue_date: new Date().toISOString().slice(0, 10),
    notes: '',
    items: [{ ...emptyItem }],
  });

  const [suggestionsByIndex, setSuggestionsByIndex] = useState({});

  const patientNameById = useMemo(() => {
    return patients.reduce((acc, p) => {
      acc[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      return acc;
    }, {});
  }, [patients]);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    loadOrdonnances();
  }, [page, filters.patient_id, filters.search, filters.date_from, filters.date_to]);

  const loadPatients = async () => {
    try {
      const res = await patientAPI.getAll(1);
      setPatients(res.data.data || res.data || []);
    } catch {
      setPatients([]);
    }
  };

  const loadOrdonnances = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page };

      if (filters.patient_id) {
        params.patient_id = filters.patient_id;
      }

      if (filters.search) {
        params.search = filters.search;
      }

      if (filters.date_from) {
        params.date_from = filters.date_from;
      }

      if (filters.date_to) {
        params.date_to = filters.date_to;
      }

      const res = await ordonnanceAPI.getAll(params);
      setOrdonnances(res.data.data || []);
      setTotalPages(res.data.last_page || 1);
    } catch {
      setError('Erreur de chargement des ordonnances');
      setOrdonnances([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index, key, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [key]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      if (prev.items.length === 1) return prev;
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items };
    });
  };

  const fetchSuggestions = async (index, query) => {
    try {
      const res = await medicationAPI.suggestions(query);
      setSuggestionsByIndex((prev) => ({ ...prev, [index]: res.data || [] }));
    } catch {
      setSuggestionsByIndex((prev) => ({ ...prev, [index]: [] }));
    }
  };

  const selectSuggestion = (index, medication) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = {
        ...items[index],
        medication_id: medication.id,
        medication_name: medication.name || medication.medication_name || '',
        frequency: items[index].frequency || medication.default_frequency || '',
        duration: items[index].duration || medication.default_duration || '',
      };
      return { ...prev, items };
    });
    setSuggestionsByIndex((prev) => ({ ...prev, [index]: [] }));
  };

  const resetForm = () => {
    setForm({
      patient_id: '',
      issue_date: new Date().toISOString().slice(0, 10),
      notes: '',
      items: [{ ...emptyItem }],
    });
    setSuggestionsByIndex({});
  };

  const createOrdonnance = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...form,
        items: form.items.map((item) => ({
          medication_id: item.medication_id || null,
          medication_name: item.medication_name,
          frequency: item.frequency,
          duration: item.duration || null,
          instructions: item.instructions || null,
        })),
      };

      await ordonnanceAPI.create(payload);
      setShowCreateModal(false);
      resetForm();
      await loadOrdonnances();
    } catch {
      alert('Erreur lors de la creation de l\'ordonnance');
    } finally {
      setSaving(false);
    }
  };

  const deleteOrdonnance = async (id) => {
    if (!window.confirm('Supprimer cette ordonnance ?')) return;

    try {
      await ordonnanceAPI.delete(id);
      await loadOrdonnances();
    } catch {
      alert('Erreur lors de la suppression');
    }
  };

  const downloadPdf = async (ordonnance) => {
    try {
      const res = await ordonnanceAPI.generate(ordonnance.id, { variables: {} });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ordonnance_${ordonnance.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Erreur lors de la generation du PDF');
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ordonnances</h1>
          <p className="text-gray-600 mt-1">Gerez toutes les ordonnances depuis une vue globale</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-lg bg-linear-to-br from-white/80 via-blue-50/60 to-white/90 backdrop-blur-sm transition-all duration-300 group hover:shadow-2xl hover:border-blue-200">
        <div className="px-4 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Liste des ordonnances</h2>
            <p className="text-gray-500 text-sm mt-1">Recherche, creation et generation PDF</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-blue-600 text-sm font-medium rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer select-none border border-blue-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle ordonnance
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-200 grid grid-cols-1 md:grid-cols-5 gap-2">
          <div className="md:col-span-2 relative">
            <input
              type="text"
              placeholder="Rechercher patient, medicament ou note..."
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
              Reinitialiser les filtres
            </button>
          </div>
        </div>

        {error && <div className="px-4 py-2 text-red-600 text-sm">{error}</div>}

        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="p-6 text-gray-600">Chargement...</div>
          ) : (
            <table className="min-w-150 w-full text-xs sm:text-sm md:text-base">
              <thead>
                <tr>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Patient</th>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Praticien</th>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Medicaments</th>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ordonnances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      Aucune ordonnance
                    </td>
                  </tr>
                ) : (
                  ordonnances.map((o) => (
                    <tr key={o.id} className="hover:bg-blue-50 transition-colors duration-150 group">
                      <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">{o.issue_date}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 font-medium text-gray-900 whitespace-nowrap">{o.patient ? `${o.patient.first_name} ${o.patient.last_name}` : patientNameById[o.patient_id] || '-'}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">{o.issuer?.name || '-'}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4">
                        {(o.items || []).slice(0, 2).map((it) => it.medication_name).join(', ')}
                        {(o.items || []).length > 2 ? ' ...' : ''}
                      </td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => downloadPdf(o)}
                            className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center justify-center"
                            title="Generer PDF"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-8m0 8l-3-3m3 3l3-3M4 20h16" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteOrdonnance(o.id)}
                            className="text-red-600 hover:text-red-800 font-semibold inline-flex items-center justify-center"
                            title="Supprimer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }} onClick={() => { setShowCreateModal(false); resetForm(); }}>
          <div className="relative w-full max-w-5xl mx-0.5 bg-white rounded-lg shadow-lg border border-blue-100 max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none" onClick={() => { setShowCreateModal(false); resetForm(); }} aria-label="Fermer" type="button">&times;</button>
            <div className="px-4 pt-6 pb-3 bg-linear-to-r from-blue-50 via-white to-blue-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900">Nouvelle ordonnance</h3>
              <p className="text-sm text-gray-500 mt-1">Ajouter les informations de prescription</p>
            </div>

            <form onSubmit={createOrdonnance} className="px-4 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  required
                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                  value={form.patient_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, patient_id: e.target.value }))}
                >
                  <option value="">Selectionner un patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </select>

                <input
                  required
                  type="date"
                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                  value={form.issue_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, issue_date: e.target.value }))}
                />

                <input
                  type="text"
                  placeholder="Notes generales"
                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={index} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      <div className="md:col-span-2 relative">
                        <input
                          required
                          type="text"
                          placeholder="Medicament"
                          className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                          value={item.medication_name}
                          onChange={(e) => {
                            updateItem(index, 'medication_name', e.target.value);
                            updateItem(index, 'medication_id', '');
                            fetchSuggestions(index, e.target.value);
                          }}
                          onFocus={() => fetchSuggestions(index, item.medication_name || '')}
                        />
                        {(suggestionsByIndex[index] || []).length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow max-h-48 overflow-auto">
                            {(suggestionsByIndex[index] || []).map((m) => (
                              <button
                                key={`${m.source || 'suggestion'}-${m.id || m.medication_name || m.name}`}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                                onClick={() => selectSuggestion(index, m)}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span>{m.name || m.medication_name}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.source === 'history' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {m.source === 'history' ? `Historique${m.used_count ? ` · ${m.used_count}` : ''}` : 'Catalogue'}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <input
                        required
                        type="text"
                        placeholder="Frequence (ex: 3 par jour)"
                        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                        value={item.frequency}
                        onChange={(e) => updateItem(index, 'frequency', e.target.value)}
                      />

                      <input
                        type="text"
                        placeholder="Duree"
                        className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                        value={item.duration}
                        onChange={(e) => updateItem(index, 'duration', e.target.value)}
                      />

                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-sm"
                      >
                        Retirer
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Instructions"
                      className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                      value={item.instructions}
                      onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-blue-600 text-sm font-medium rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter une ligne
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-5 py-2 text-sm font-semibold rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  Annuler
                </button>
                <button
                  disabled={saving}
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Ordonnances;
