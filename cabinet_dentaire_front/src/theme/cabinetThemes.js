export const CABINET_THEME_KEYS = ['default', 'red', 'blue_sky', 'emerald_teal', 'indigo_blue', 'cyan_slate'];

const PALETTES = {
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

const THEME_FAMILIES = ['blue', 'sky', 'indigo', 'gray'];
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const THEME_FAMILY_MAP = {
  default: { blue: 'blue', sky: 'sky', indigo: 'indigo', gray: 'gray' },
  red: { blue: 'red', sky: 'rose', indigo: 'red', gray: 'gray' },
  blue_sky: { blue: 'blue', sky: 'sky', indigo: 'blue', gray: 'gray' },
  emerald_teal: { blue: 'emerald', sky: 'teal', indigo: 'emerald', gray: 'gray' },
  indigo_blue: { blue: 'indigo', sky: 'blue', indigo: 'indigo', gray: 'gray' },
  cyan_slate: { blue: 'cyan', sky: 'cyan', indigo: 'slate', gray: 'slate' },
};

export const CABINET_THEME_OPTIONS = [
  {
    key: 'default',
    label: 'Thème par défaut',
    description: 'Reprend la palette actuelle du cabinet.',
    preview: {
      primary: PALETTES.blue[600],
      secondary: PALETTES.indigo[600],
      background: PALETTES.gray[50],
    },
  },
  {
    key: 'red',
    label: 'Rouge',
    description: 'Plus direct et plus affirmé.',
    preview: {
      primary: PALETTES.red[600],
      secondary: PALETTES.rose[500],
      background: PALETTES.red[50],
    },
  },
  {
    key: 'blue_sky',
    label: 'Bleu / Sky',
    description: 'Très proche du thème actuel.',
    preview: {
      primary: PALETTES.blue[600],
      secondary: PALETTES.sky[500],
      background: PALETTES.blue[50],
    },
  },
  {
    key: 'emerald_teal',
    label: 'Emerald / Teal',
    description: 'Ambiance médicale propre et douce.',
    preview: {
      primary: PALETTES.emerald[600],
      secondary: PALETTES.teal[500],
      background: PALETTES.emerald[50],
    },
  },
  {
    key: 'indigo_blue',
    label: 'Indigo / Blue',
    description: 'Plus premium et sérieuse.',
    preview: {
      primary: PALETTES.indigo[600],
      secondary: PALETTES.blue[600],
      background: PALETTES.indigo[50],
    },
  },
  {
    key: 'cyan_slate',
    label: 'Cyan / Slate',
    description: 'Plus moderne et plus froide.',
    preview: {
      primary: PALETTES.cyan[600],
      secondary: PALETTES.slate[600],
      background: PALETTES.slate[50],
    },
  },
];

export const CABINET_THEME_DEFAULT = 'default';

export const CABINET_THEME_PRESETS = Object.fromEntries(
  Object.entries(THEME_FAMILY_MAP).map(([themeKey, familyMap]) => [
    themeKey,
    {
      key: themeKey,
      families: familyMap,
    },
  ])
);

export const CABINET_THEME_COLOR_FAMILIES = THEME_FAMILIES;
export const CABINET_THEME_SHADES = SHADES;
export { PALETTES as CABINET_THEME_PALETTES };

export const isValidCabinetTheme = (value) => CABINET_THEME_OPTIONS.some((theme) => theme.key === value);
