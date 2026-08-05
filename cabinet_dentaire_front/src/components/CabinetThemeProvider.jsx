import { useEffect } from 'react';
import { settingAPI } from '../services/api';
import {
  CABINET_THEME_COLOR_FAMILIES,
  CABINET_THEME_DEFAULT,
  CABINET_THEME_PRESETS,
  CABINET_THEME_SHADES,
} from '../theme/cabinetThemes';

const buildThemePaletteIndex = () => {
  const paletteIndex = {};

  const rawPalettes = {
    blue: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
    sky: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },
    indigo: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      950: '#1e1b4b',
    },
    emerald: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      950: '#022c22',
    },
    teal: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
      950: '#042f2e',
    },
    cyan: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#06b6d4',
      600: '#0891b2',
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
      950: '#083344',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
    red: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a',
    },
    rose: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
      950: '#4c0519',
    },
  };

  Object.entries(rawPalettes).forEach(([name, palette]) => {
    paletteIndex[name] = palette;
  });

  return paletteIndex;
};

const PALETTES = buildThemePaletteIndex();

const applyCabinetTheme = (themeKey = CABINET_THEME_DEFAULT) => {
  const preset = CABINET_THEME_PRESETS[themeKey] || CABINET_THEME_PRESETS[CABINET_THEME_DEFAULT];
  const families = preset?.families || CABINET_THEME_PRESETS[CABINET_THEME_DEFAULT].families;

  CABINET_THEME_COLOR_FAMILIES.forEach((familyName) => {
    const sourceFamily = families[familyName] || familyName;
    const palette = PALETTES[sourceFamily] || PALETTES[familyName];

    if (!palette) return;

    CABINET_THEME_SHADES.forEach((shade) => {
      document.documentElement.style.setProperty(
        `--color-${familyName}-${shade}`,
        palette[shade]
      );
    });
  });

  document.documentElement.dataset.cabinetTheme = preset?.key || CABINET_THEME_DEFAULT;
};

export const CabinetThemeProvider = ({ children }) => {
  useEffect(() => {
    let isMounted = true;

    const loadTheme = async () => {
      try {
        const { data } = await settingAPI.getAll();
        const nextTheme = data?.cabinet_theme || CABINET_THEME_DEFAULT;
        if (isMounted) {
          applyCabinetTheme(nextTheme);
        }
      } catch {
        if (isMounted) {
          applyCabinetTheme(CABINET_THEME_DEFAULT);
        }
      }
    };

    applyCabinetTheme(CABINET_THEME_DEFAULT);
    loadTheme();

    const handleSettingsUpdate = () => {
      loadTheme();
    };

    window.addEventListener('cabinet-settings-updated', handleSettingsUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('cabinet-settings-updated', handleSettingsUpdate);
    };
  }, []);

  return children;
};
