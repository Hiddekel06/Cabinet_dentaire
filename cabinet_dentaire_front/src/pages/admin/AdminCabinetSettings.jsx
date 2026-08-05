import { useEffect, useRef, useState } from 'react';
import { Layout } from '../../components/Layout';
import { settingAPI } from '../../services/api';
import { CABINET_THEME_OPTIONS } from '../../theme/cabinetThemes';

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');
const DEFAULT_LOGO_SRC = '/images/logoCabinet.png';

const AdminCabinetSettings = () => {
  const [form, setForm] = useState({
    cabinet_name: '',
    cabinet_address: '',
    cabinet_phone: '',
    pdf_header_text: '',
    module_clinical_observations_enabled: false,
    cabinet_theme: 'default',
  });
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await settingAPI.getAll();
      setForm({
        cabinet_name: data.cabinet_name || '',
        cabinet_address: data.cabinet_address || '',
        cabinet_phone: data.cabinet_phone || '',
        pdf_header_text: data.pdf_header_text || '',
        module_clinical_observations_enabled: Boolean(data.module_clinical_observations_enabled),
        cabinet_theme: data.cabinet_theme || 'default',
      });
      if (data.cabinet_logo) {
        setLogoUrl(`${BACKEND_URL}/storage/${data.cabinet_logo}`);
      } else {
        setLogoUrl(DEFAULT_LOGO_SRC);
      }
    } catch (err) {
      setError('Impossible de charger les paramètres.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess('');
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await settingAPI.update(form);
      window.dispatchEvent(new Event('cabinet-settings-updated'));
      setSuccess('Paramètres enregistrés avec succès !');
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setSuccess('');
    setError('');
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    setSuccess('');
    setError('');
    try {
      const { data } = await settingAPI.uploadLogo(logoFile);
      window.dispatchEvent(new Event('cabinet-settings-updated'));
      setLogoUrl(`${BACKEND_URL}/storage/${data.cabinet_logo}`);
      setLogoPreview(null);
      setLogoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccess('Logo mis à jour avec succès !');
    } catch (err) {
      setError(err?.response?.data?.message || "Erreur lors de l'upload du logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!window.confirm('Supprimer le logo actuel et revenir au logo par défaut ?')) return;
    setDeletingLogo(true);
    try {
      await settingAPI.deleteLogo();
      window.dispatchEvent(new Event('cabinet-settings-updated'));
      setLogoUrl(DEFAULT_LOGO_SRC);
      setLogoPreview(null);
      setLogoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccess('Logo supprimé. Le logo par défaut sera utilisé.');
    } catch (err) {
      setError('Erreur lors de la suppression du logo.');
    } finally {
      setDeletingLogo(false);
    }
  };

  const handleThemeSelect = (themeKey) => {
    setForm((prev) => ({ ...prev, cabinet_theme: themeKey }));
    setSuccess('');
    setError('');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-500 text-sm">Chargement des paramètres...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* En-tête */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres du cabinet</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ces informations apparaissent sur tous les PDF générés (reçus, ordonnances, etc.).
          </p>
        </div>

        {/* Alertes */}
        {success && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm font-medium">
            <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm font-medium">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Section Logo */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            Logo du cabinet
          </h2>

          <div className="flex items-start gap-6">
            {/* Aperçu logo */}
            <div className="shrink-0">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                {(logoPreview || logoUrl) ? (
                  <img
                    src={logoPreview || logoUrl}
                    alt="Logo cabinet"
                    className="w-full h-full object-contain"
                  />
                ) : null}
              </div>
            </div>

            {/* Contrôles */}
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">
                  Choisir un nouveau logo
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoSelect}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="text-[11px] text-gray-400 mt-1">PNG, JPG, WEBP ou SVG · Max 2 Mo</p>
              </div>

              <div className="flex gap-2">
                {logoFile && (
                  <button
                    type="button"
                    onClick={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {uploadingLogo ? 'Téléversement...' : 'Valider le logo'}
                  </button>
                )}
                {logoUrl && !logoPreview && (
                  <button
                    type="button"
                    onClick={handleLogoDelete}
                    disabled={deletingLogo}
                    className="px-4 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 border border-red-100 disabled:opacity-50 transition-colors"
                  >
                    {deletingLogo ? 'Suppression...' : 'Supprimer le logo'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire paramètres */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
            Informations du cabinet
          </h2>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nom du cabinet *</label>
            <input
              type="text"
              name="cabinet_name"
              value={form.cabinet_name}
              onChange={handleChange}
              required
              placeholder="Ex: Matlabul Shifah"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Adresse</label>
            <input
              type="text"
              name="cabinet_address"
              value={form.cabinet_address}
              onChange={handleChange}
              placeholder="Ex: Cité Fadia, Guentaba n°23, Dakar"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Téléphone</label>
            <input
              type="text"
              name="cabinet_phone"
              value={form.cabinet_phone}
              onChange={handleChange}
              placeholder="Ex: +221 77 721 98 33"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Mention complémentaire PDF (optionnel)</label>
            <textarea
              name="pdf_header_text"
              value={form.pdf_header_text}
              onChange={handleChange}
              rows={2}
              placeholder="Ex: Cabinet agréé Ministère de la Santé · NINEA 12345"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-gray-800">Thème du cabinet</div>
                <p className="text-xs text-gray-500 mt-1">
                  Choisissez une palette validée. Vous pouvez revenir au thème par défaut à tout moment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleThemeSelect('default')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline whitespace-nowrap"
              >
                Réinitialiser
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {CABINET_THEME_OPTIONS.map((theme) => {
                const isActive = form.cabinet_theme === theme.key;
                return (
                  <button
                    key={theme.key}
                    type="button"
                    onClick={() => handleThemeSelect(theme.key)}
                    className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
                      isActive
                        ? 'border-blue-500 bg-white ring-2 ring-blue-100'
                        : 'border-gray-200 bg-white hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{theme.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{theme.description}</div>
                      </div>
                      {isActive && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                          Actif
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span className="h-3 w-10 rounded-full" style={{ backgroundColor: theme.preview.primary }} />
                      <span className="h-3 w-10 rounded-full" style={{ backgroundColor: theme.preview.secondary }} />
                      <span className="h-3 w-10 rounded-full" style={{ backgroundColor: theme.preview.background }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <div className="text-sm font-semibold text-gray-800">Activer le module Observations cliniques</div>
                <p className="text-xs text-gray-500 mt-1">
                  Le module devient visible dans la barre latérale et accessible aux utilisateurs autorisés.
                </p>
              </div>
              <input
                type="checkbox"
                name="module_clinical_observations_enabled"
                checked={Boolean(form.module_clinical_observations_enabled)}
                onChange={(e) => setForm(prev => ({ ...prev, module_clinical_observations_enabled: e.target.checked }))}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-100 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Enregistrement...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer les paramètres
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AdminCabinetSettings;
