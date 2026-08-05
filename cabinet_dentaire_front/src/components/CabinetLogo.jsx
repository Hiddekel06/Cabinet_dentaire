import { useEffect, useState } from 'react';
import { settingAPI } from '../services/api';

const DEFAULT_LOGO_SRC = '/images/logoCabinet.png';
const BACKEND_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const resolveLogoSrc = (value) => {
  if (!value) return DEFAULT_LOGO_SRC;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${BACKEND_ORIGIN}${value}`;
  return `${BACKEND_ORIGIN}/${value}`;
};

export const CabinetLogo = ({
  className = 'w-12 h-12 rounded-full object-cover shadow-sm border border-gray-200 bg-white',
  alt = 'Logo du cabinet',
  fallbackSrc = DEFAULT_LOGO_SRC,
  onLoaded,
}) => {
  const [src, setSrc] = useState(fallbackSrc);

  useEffect(() => {
    let isMounted = true;

    const loadLogo = async () => {
      try {
        const { data } = await settingAPI.getBranding();
        const nextSrc = resolveLogoSrc(data?.cabinet_logo_url || data?.cabinet_logo);
        if (isMounted) {
          setSrc(nextSrc || fallbackSrc);
          onLoaded?.(nextSrc || fallbackSrc, data);
        }
      } catch {
        if (isMounted) {
          setSrc(fallbackSrc);
          onLoaded?.(fallbackSrc, null);
        }
      }
    };

    loadLogo();

    const handleUpdate = () => {
      loadLogo();
    };

    window.addEventListener('cabinet-settings-updated', handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('cabinet-settings-updated', handleUpdate);
    };
  }, [fallbackSrc, onLoaded]);

  return <img src={src} alt={alt} className={className} onError={() => setSrc(fallbackSrc)} />;
};