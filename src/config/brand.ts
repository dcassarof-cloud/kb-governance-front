// src/config/brand.ts

export type BrandTheme = 'light' | 'dark';

/**
 * Fonte única de verdade para marca do produto.
 * Paths apontam para /public.
 */
export const BRAND = {
  appName: 'Consisa Organisa',

  logos: {
    dark: '/consisa-logo.png',
    light: '/consisa-logo-temaClaro.png',
  },

  symbols: {
    dark: '/consisa-symbol.png',
    light: '/consisa-symbol.png',
  },
} as const;

/**
 * Resolve tema para o domínio da marca (light/dark).
 * Segurança: qualquer valor diferente de 'light' vira 'dark'.
 */
export function resolveBrandTheme(theme?: string): BrandTheme {
  return theme === 'light' ? 'light' : 'dark';
}
