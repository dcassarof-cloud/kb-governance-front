export const BRAND = {
  appName: 'Consisa Organisa',
  moduleName: '',

  logos: {
    dark: '/consisa-logo.png',
    light: '/consisa-logo-temaClaro.png',
  },

  symbols: {
    dark: '/consisa-symbol.png',
    light: '/consisa-symbol-temaClaro.png',
  },
} as const;

export type BrandTheme = 'light' | 'dark';
