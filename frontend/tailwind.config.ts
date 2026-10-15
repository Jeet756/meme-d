import type { Config } from 'tailwindcss';

// Design tokens. Violet carries structure and interaction; lime is reserved for money that has been earned.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0B0712', 900: '#110C1B', 800: '#1A1326', 700: '#251B36', 600: '#33264A', 500: '#46365F' },
        violet: { 200: '#DDD3FF', 300: '#C4B5FD', 400: '#A78BFA', 500: '#8B5CF6', 600: '#7440F0', 700: '#5B2FCB' },
        lime: { 300: '#E6FF94', 400: '#D6FA5C', 500: '#C6F432', 600: '#A6D11A' },
        fog: { 50: '#F7F4FC', 100: '#EAE5F4', 200: '#D3CCE2', 300: '#B3A9C9', 400: '#9A8FB3', 500: '#7F7399' },
        signal: { red: '#FF7A8A', amber: '#FFC15E' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: { panel: '1.25rem', control: '0.75rem' },
      boxShadow: {
        panel: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 18px 40px -24px rgb(0 0 0 / 0.8)',
        glow: '0 0 0 1px rgb(198 244 50 / 0.35), 0 8px 30px -8px rgb(198 244 50 / 0.35)',
      },
      keyframes: {
        'step-in': { '0%': { transform: 'scaleY(0.2)', opacity: '0' }, '100%': { transform: 'scaleY(1)', opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'toast-in': { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: {
        'step-in': 'step-in 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        'toast-in': 'toast-in 0.25s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
