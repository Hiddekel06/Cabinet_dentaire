import { createContext, useContext, useEffect, useState } from 'react';
import { settingAPI } from '../services/api';

const DEFAULT_APP_NAME = 'Clinique Médicale';

const BACKEND_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const resolveLogoUrl = (value) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${BACKEND_ORIGIN}${value}`;
  return `${BACKEND_ORIGIN}/${value}`;
};

const setDynamicFavicon = (url) => {
  if (!url) return;
  // Supprimer l'ancien favicon
  const existing = document.querySelectorAll("link[rel~='icon']");
  existing.forEach((el) => el.remove());
  // Créer le nouveau avec cache-busting timestamp
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  // Ajouter ?v=timestamp pour forcer le rechargement par le navigateur
  const sep = url.includes('?') ? '&' : '?';
  link.href = `${url}${sep}v=${Date.now()}`;
  document.head.appendChild(link);
};

const CabinetContext = createContext({
  cabinetName: DEFAULT_APP_NAME,
  cabinetSettings: {},
  logoUrl: null,
  logoVersion: 0,
  refreshSettings: () => {},
});

export const CabinetProvider = ({ children }) => {
  const [cabinetName, setCabinetName] = useState(DEFAULT_APP_NAME);
  const [cabinetSettings, setCabinetSettings] = useState({});
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoVersion, setLogoVersion] = useState(Date.now());

  const loadSettings = async () => {
    try {
      // Charger nom du cabinet + paramètres généraux
      const { data } = await settingAPI.getAll();
      if (data) {
        const name = data.cabinet_name || DEFAULT_APP_NAME;
        setCabinetName(name);
        setCabinetSettings(data);
        // Mise à jour dynamique du titre de l'onglet du navigateur
        document.title = name;
      }
    } catch {
      // En cas d'erreur, on garde le nom par défaut
    }

    try {
      // Charger le logo pour le favicon dynamique et le partager dans le contexte
      const { data: branding } = await settingAPI.getBranding();
      const resolvedLogo = resolveLogoUrl(branding?.cabinet_logo_url || branding?.cabinet_logo);
      if (resolvedLogo) {
        setDynamicFavicon(resolvedLogo);
        setLogoUrl(resolvedLogo);
      } else {
        setLogoUrl(null);
      }
      // Incrémenter la version pour forcer le cache-bust dans CabinetLogo
      setLogoVersion(Date.now());
    } catch {
      // Favicon statique conservé si le logo n'est pas disponible
    }
  };

  useEffect(() => {
    loadSettings();

    // Se synchroniser quand les settings sont sauvegardés depuis AdminCabinetSettings
    const handleSettingsUpdate = () => loadSettings();
    window.addEventListener('cabinet-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('cabinet-settings-updated', handleSettingsUpdate);
  }, []);

  return (
    <CabinetContext.Provider value={{ cabinetName, cabinetSettings, logoUrl, logoVersion, refreshSettings: loadSettings }}>
      {children}
    </CabinetContext.Provider>
  );
};

export const useCabinet = () => useContext(CabinetContext);
