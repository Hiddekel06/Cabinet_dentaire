import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { userAPI } from '../../services/api';

const initialFormState = {
  name: '',
  email: '',
  phone: '',
  role: 'doctor',
  is_active: true,
  password: '',
  password_confirmation: '',
};

const roleOptions = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'doctor', label: 'Docteur' },
  { value: 'secretary', label: 'Secrétaire' },
];

const roleBadgeClasses = {
  admin: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  doctor: 'bg-blue-50 text-blue-700 border-blue-100',
  secretary: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const AdminCabinetAccounts = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(initialFormState);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = async (nextSearch = search) => {
    setLoading(true);
    try {
      const { data } = await userAPI.getAll(nextSearch ? { search: nextSearch } : {});
      setUsers(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setError('Impossible de charger les comptes.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setForm(initialFormState);
    setEditingId(null);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (name !== 'password' && name !== 'password_confirmation') {
      setError('');
      setSuccess('');
    } else {
      setError('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
        is_active: form.is_active,
      };

      if (form.password) {
        payload.password = form.password;
        payload.password_confirmation = form.password_confirmation;
      }

      if (editingId) {
        await userAPI.update(editingId, payload);
        setSuccess('Compte mis à jour avec succès.');
      } else {
        if (!form.password) {
          setError('Le mot de passe est obligatoire pour créer un compte.');
          setSaving(false);
          return;
        }
        await userAPI.create(payload);
        setSuccess('Compte créé avec succès.');
      }

      resetForm();
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur lors de l’enregistrement du compte.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'doctor',
      is_active: Boolean(user.is_active),
      password: '',
      password_confirmation: '',
    });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleActive = async (user) => {
    setError('');
    setSuccess('');
    try {
      await userAPI.update(user.id, {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_active: !user.is_active,
      });
      setSuccess(`Compte ${!user.is_active ? 'activé' : 'suspendu'} avec succès.`);
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Impossible de modifier le statut du compte.');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Supprimer définitivement le compte ${user.name} ?`)) return;

    setDeletingId(user.id);
    setError('');
    setSuccess('');
    try {
      await userAPI.delete(user.id);
      setSuccess('Compte supprimé avec succès.');
      await loadUsers();
      if (editingId === user.id) {
        resetForm();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Impossible de supprimer ce compte.');
    } finally {
      setDeletingId(null);
    }
  };

  const activeCount = useMemo(() => users.filter((user) => user.is_active).length, [users]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link to="/admin/parametres" className="hover:text-blue-700">Paramètres du cabinet</Link>
              <span>/</span>
              <span className="text-gray-700 font-medium">Comptes</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des comptes</h1>
            <p className="text-sm text-gray-600 mt-1">Créer, modifier et supprimer les comptes du cabinet.</p>
          </div>
          <Link
            to="/admin/parametres"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Retour aux paramètres
          </Link>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm font-medium">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm font-medium">
            <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{editingId ? 'Modifier le compte' : 'Créer un compte'}</h2>
                <p className="text-xs text-gray-500 mt-1">Les comptes sont limités aux rôles du cabinet.</p>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                >
                  Annuler l’édition
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nom complet *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="Ex: Dr. Awa Diop"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="utilisateur@cabinet.com"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Téléphone</label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="Ex: +221 77 000 00 00"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rôle *</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Mot de passe {editingId ? '(laisser vide pour conserver)' : '*'}</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder={editingId ? 'Nouveau mot de passe' : 'Choisir un mot de passe'}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Confirmation du mot de passe</label>
                <input
                  type="password"
                  name="password_confirmation"
                  value={form.password_confirmation}
                  onChange={handleChange}
                  minLength={8}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="Confirmer le mot de passe"
                />
              </div>

              <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Compte actif</div>
                    <p className="text-xs text-gray-500 mt-1">Un compte suspendu ne peut plus se connecter.</p>
                  </div>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={Boolean(form.is_active)}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-100 disabled:opacity-50 transition-all"
              >
                {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Créer le compte'}
              </button>
            </div>
          </form>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Comptes existants</h2>
                <p className="text-xs text-gray-500 mt-1">{users.length} compte(s) au total, {activeCount} actif(s).</p>
              </div>
              <div className="w-full max-w-xs">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      loadUsers(search);
                    }
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="Rechercher un compte"
                />
              </div>
            </div>

            <div className="space-y-3 max-h-180 overflow-y-auto pr-1">
              {loading ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Chargement des comptes...
                </div>
              ) : users.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Aucun compte trouvé.
                </div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900">{user.name}</h3>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${roleBadgeClasses[user.role] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                            {user.role}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${user.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {user.is_active ? 'Actif' : 'Suspendu'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                        {user.phone && <p className="text-xs text-gray-500">{user.phone}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(user)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${user.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100'}`}
                      >
                        {user.is_active ? 'Suspendre' : 'Activer'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === user.id ? 'Suppression...' : 'Supprimer'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminCabinetAccounts;
