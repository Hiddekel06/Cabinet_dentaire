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
      const params = {
        page,
        patient_id: filters.patient_id || undefined,
        search: filters.search || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      };
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
    if (!query || query.length < 2) {
      setSuggestionsByIndex((prev) => ({ ...prev, [index]: [] }));
      return;
    }

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
        medication_name: medication.name,
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

  return (
    <Layout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Ordonnances</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Nouvelle ordonnance
          </button>
        </div>

        <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            className="border rounded-lg px-3 py-2"
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
            type="text"
            placeholder="Recherche (patient, medicament, notes)"
            className="border rounded-lg px-3 py-2"
            value={filters.search}
            onChange={(e) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, search: e.target.value }));
            }}
          />

          <input
            type="date"
            className="border rounded-lg px-3 py-2"
            value={filters.date_from}
            onChange={(e) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, date_from: e.target.value }));
            }}
          />

          <input
            type="date"
            className="border rounded-lg px-3 py-2"
            value={filters.date_to}
            onChange={(e) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, date_to: e.target.value }));
            }}
          />
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="bg-white border rounded-lg overflow-x-auto">
          {loading ? (
            <div className="p-6">Chargement...</div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 border-b">Date</th>
                  <th className="text-left px-4 py-2 border-b">Patient</th>
                  <th className="text-left px-4 py-2 border-b">Praticien</th>
                  <th className="text-left px-4 py-2 border-b">Medicaments</th>
                  <th className="text-left px-4 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ordonnances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      Aucune ordonnance
                    </td>
                  </tr>
                ) : (
                  ordonnances.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-2 border-b">{o.issue_date}</td>
                      <td className="px-4 py-2 border-b">{o.patient ? `${o.patient.first_name} ${o.patient.last_name}` : patientNameById[o.patient_id] || '-'}</td>
                      <td className="px-4 py-2 border-b">{o.issuer?.name || '-'}</td>
                      <td className="px-4 py-2 border-b">
                        {(o.items || []).slice(0, 2).map((it) => it.medication_name).join(', ')}
                        {(o.items || []).length > 2 ? ' ...' : ''}
                      </td>
                      <td className="px-4 py-2 border-b">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => downloadPdf(o)}
                            className="px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                          >
                            Generer PDF
                          </button>
                          <button
                            onClick={() => deleteOrdonnance(o.id)}
                            className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                          >
                            Supprimer
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
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Precedent
            </button>
            <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Nouvelle ordonnance</h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                Fermer
              </button>
            </div>

            <form onSubmit={createOrdonnance} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  required
                  className="border rounded-lg px-3 py-2"
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
                  className="border rounded-lg px-3 py-2"
                  value={form.issue_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, issue_date: e.target.value }))}
                />

                <input
                  type="text"
                  placeholder="Notes generales"
                  className="border rounded-lg px-3 py-2"
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      <div className="md:col-span-2 relative">
                        <input
                          required
                          type="text"
                          placeholder="Medicament"
                          className="border rounded-lg px-3 py-2 w-full"
                          value={item.medication_name}
                          onChange={(e) => {
                            updateItem(index, 'medication_name', e.target.value);
                            updateItem(index, 'medication_id', '');
                            fetchSuggestions(index, e.target.value);
                          }}
                        />
                        {(suggestionsByIndex[index] || []).length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow max-h-48 overflow-auto">
                            {(suggestionsByIndex[index] || []).map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                onClick={() => selectSuggestion(index, m)}
                              >
                                {m.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <input
                        required
                        type="text"
                        placeholder="Frequence (ex: 3 par jour)"
                        className="border rounded-lg px-3 py-2"
                        value={item.frequency}
                        onChange={(e) => updateItem(index, 'frequency', e.target.value)}
                      />

                      <input
                        type="text"
                        placeholder="Duree"
                        className="border rounded-lg px-3 py-2"
                        value={item.duration}
                        onChange={(e) => updateItem(index, 'duration', e.target.value)}
                      />

                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Retirer
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Instructions"
                      className="border rounded-lg px-3 py-2 w-full"
                      value={item.instructions}
                      onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  + Ajouter une ligne
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg"
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
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
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
