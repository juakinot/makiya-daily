import type { Config } from 'tailwindcss';

/**
 * Design tokens MakiYa — según el Brand Kit (manual de marca).
 * Petróleo #075B55 · Turquesa #20A995 · Menta #D9F1EB · Blanco · Coral #F0785A · Grafito #263B39.
 * turq-500 y accent-500 (coral) no alcanzan contraste AA para texto pequeño: para texto se usan turq-700 y accent-700.
 * Ver docs/03-ux-ui.md para reglas de uso y contraste.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        petrol: { 50: '#EEF6F5', 100: '#D3E7E5', 600: '#0A6A63', 700: '#075B55', 800: '#05473F', 900: '#03332F' },
        turq: { 50: '#E8F7F4', 100: '#C6EDE4', 500: '#20A995', 600: '#178A79', 700: '#137366' },
        mint: { 50: '#EEF8F5', 100: '#D9F1EB', 200: '#BFE6DC' },
        accent: { 50: '#FEF1EC', 100: '#FCDACF', 500: '#F0785A', 700: '#B8472B' },
        ink: { 900: '#263B39', 700: '#3C504E', 600: '#566866', 400: '#8A9897', 300: '#B5C0BF' },
        line: '#E3EAE9',
        surface: '#F5F8F7',
        warn: { 50: '#FEF3C7', 700: '#B45309' },
      },
      fontFamily: {
        // Manual de marca: Inter para textos, descripciones y UI; Manrope para títulos, botones y elementos clave.
        sans: ['"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Manrope Variable"', '"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      boxShadow: {
        card: '0 1px 2px rgba(38,59,57,0.06), 0 1px 1px rgba(38,59,57,0.04)',
        pop: '0 12px 32px -8px rgba(7,91,85,0.22)',
      },
      maxWidth: { content: '1120px' },
    },
  },
  plugins: [],
} satisfies Config;
