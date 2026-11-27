import type { Config } from 'tailwindcss';

/**
 * Design tokens MakiYa.
 * turq-500 (#17AAA0) y accent-500 (#EA1B6B) se extrajeron del archivo del logo oficial.
 * Ver docs/03-ux-ui.md para reglas de uso y contraste.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        petrol: { 50: '#EEF6F5', 100: '#D3E7E5', 600: '#0A6A63', 700: '#075B55', 800: '#05473F', 900: '#03332F' },
        turq: { 50: '#E9F7F6', 100: '#C9EDEA', 500: '#17AAA0', 600: '#12938A', 700: '#0E7D75' },
        mint: { 50: '#EEF8F5', 100: '#D9F1EB', 200: '#BFE6DC' },
        accent: { 50: '#FDECF2', 100: '#FBD3E2', 500: '#EA1B6B', 700: '#C2185B' },
        ink: { 900: '#263B39', 700: '#3C504E', 600: '#566866', 400: '#8A9897', 300: '#B5C0BF' },
        line: '#E3EAE9',
        surface: '#F5F8F7',
        warn: { 50: '#FEF3C7', 700: '#B45309' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
