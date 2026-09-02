import { useMemo } from 'react';
import { useCabinet } from '../context/CabinetContext';

const DEFAULT_LOGO_SRC = '/images/logoCabinet.png';

/**
 * Affiche le logo du cabinet.
 * Utilise logoUrl depuis CabinetContext (aucun appel API dupliqué).
 * Se met à jour automatiquement quand cabinet-settings-updated est déclenché
 * (car CabinetContext recharge et propage la nouvelle URL).
 */
export const CabinetLogo = ({
  className = 'w-12 h-12 rounded-full object-cover shadow-sm border border-gray-200 bg-white',
  alt = 'Logo du cabinet',
  fallbackSrc = DEFAULT_LOGO_SRC,
}) => {
  const { logoUrl, logoVersion } = useCabinet();

  // Ajouter le cache-buster (logoVersion change après chaque upload)
  const src = useMemo(() => {
    if (!logoUrl) return fallbackSrc;
    const sep = logoUrl.includes('?') ? '&' : '?';
    return `${logoUrl}${sep}v=${logoVersion}`;
  }, [logoUrl, logoVersion, fallbackSrc]);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => { e.currentTarget.src = fallbackSrc; }}
    />
  );
};