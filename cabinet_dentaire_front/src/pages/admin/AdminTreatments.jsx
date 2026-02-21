import { useEffect, useMemo, useState, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { treatmentAPI } from '../../services/api';

const initialForm = {
  name: '',
  description: '',
  price: '',
  duration: '',
};

const AdminTreatments = () => {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadTreatments();
  }, []);

  const loadTreatments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await treatmentAPI.getAll();
      const data = res?.data?.data || res?.data || [];
      setTreatments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement traitements:', err);
      setError('Impossible de charger les traitements');
    } finally {
      setLoading(false);
    }
  };

  const filteredTreatments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return treatments;
    return treatments.filter((t) => {
      const name = (t.name || '').toLowerCase();
      const description = (t.description || '').toLowerCase();
      return name.includes(search) || description.includes(search);
    });
  }, [treatments, searchTerm]);

  const resetForm = () => {
    setForm(initialForm);
    setFormError('');
    setFormSuccess('');
    setEditingTreatment(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (treatment) => {
    setForm({
      name: treatment.name || '',
      description: treatment.description || '',
      price: treatment.price ?? '',
      duration: treatment.duration ?? '',
    });
    setFormError('');
    setFormSuccess('');
    setEditingTreatment(treatment);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!form.name.trim()) {
      setFormError('Le nom du traitement est obligatoire');
      return;
    }
    if (form.price === '' || Number.isNaN(Number(form.price))) {
      setFormError('Le prix est obligatoire et doit être numérique');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      duration: form.duration === '' ? null : Number(form.duration),
    };

    setSaving(true);
    try {
      if (editingTreatment) {
        await treatmentAPI.update(editingTreatment.id, payload);
        setFormSuccess('Traitement mis à jour avec succès');
      } else {
        await treatmentAPI.create(payload);
        setFormSuccess('Traitement créé avec succès');
      }
      await loadTreatments();
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error('Erreur sauvegarde traitement:', err);
      setFormError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (treatment) => {
    if (!confirm(`Supprimer le traitement "${treatment.name}" ?`)) return;
    try {
      await treatmentAPI.delete(treatment.id);
      await loadTreatments();
    } catch (err) {
      console.error('Erreur suppression traitement:', err);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catalogue des traitements</h1>
            <p className="text-sm text-gray-600 mt-1">Gérez les traitements disponibles pour le cabinet</p>
          </div>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau traitement
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un traitement..."
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Liste des traitements</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">{error}</div>
            ) : filteredTreatments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Aucun traitement trouvé</div>
            ) : (
              filteredTreatments.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{t.name}</h3>
                      {t.duration && (
                        <span className="text-xs text-gray-500">{t.duration} min</span>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-xs text-gray-600 mt-1">{t.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">{Number(t.price).toFixed(2)} €</span>
                    <button
                      onClick={() => openEditForm(t)}
                      className="px-3 py-1.5 text-xs rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="px-3 py-1.5 text-xs rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingTreatment ? 'Modifier le traitement' : 'Nouveau traitement'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="p-1 hover:bg-white/50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Nom *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Prix *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Durée (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      step="5"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {formError && (
                  <div className="text-sm text-red-600">{formError}</div>
                )}
                {formSuccess && (
                  <div className="text-sm text-green-600">{formSuccess}</div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminTreatments;
