/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta oficial de la practica (seccion 7)
        base: '#F8FAFC',        // Fondo principal
        sidebar: '#0F172A',     // Sidebar
        brand: {
          DEFAULT: '#2563EB',   // Color principal
          dark: '#1D4ED8',
          light: '#DBEAFE',
        },
        security: '#16A34A',    // Seguridad
        cost: '#F59E0B',        // Costos
        alert: '#DC2626',       // Alertas
        ink: '#1E293B',         // Texto principal
        muted: '#64748B',       // Texto secundario
        line: '#E2E8F0',        // Bordes
        card: '#FFFFFF',        // Cards
        // Equivalencias para modo oscuro
        night: {
          bg: '#0B1220',
          card: '#111C31',
          line: '#1E2B45',
          ink: '#E2E8F0',
          muted: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        title: ['30px', { lineHeight: '38px', fontWeight: '700' }],
        subtitle: ['19px', { lineHeight: '28px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '24px' }],
        small: ['13px', { lineHeight: '20px' }],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
        pop: '0 12px 28px rgba(15, 23, 42, 0.14)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        grow: {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        'slide-in': 'slide-in 0.25s ease-out both',
        grow: 'grow 0.6s ease-out both',
      },
    },
  },
  plugins: [],
};
