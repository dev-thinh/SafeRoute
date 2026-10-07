/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        safe: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        flood: {
          ankle: '#FDE047',  // pastel yellow < 20cm
          wheel: '#FB923C',  // pastel apricot 20 - 40cm
          knee: '#F87171',   // pastel coral 40 - 60cm
          deep: '#DC2626',   // crimson red > 60cm
        },
        pastel: {
          mint: {
            50: '#F0FDF4',
            100: '#DCFCE7',
            200: '#BBF7D0',
            600: '#16A34A',
            700: '#15803D',
            800: '#166534',
            dark: '#15803D',
          },
          coral: {
            50: '#FFF1F2',
            100: '#FFE4E6',
            200: '#FECDD3',
            600: '#E11D48',
            700: '#BE123C',
            800: '#9F1239',
            dark: '#BE123C',
          },
          sky: {
            50: '#F0F9FF',
            100: '#E0F2FE',
            200: '#BAE6FD',
            500: '#0EA5E9',
            600: '#0284C7',
            700: '#0369A1',
            dark: '#0369A1',
          },
          amber: {
            50: '#FEFCE8',
            100: '#FEF9C3',
            200: '#FEF08A',
            600: '#D97706',
            700: '#A16207',
            800: '#854D0E',
            dark: '#A16207',
          },
          lavender: {
            50: '#F5F3FF',
            100: '#EDE9FE',
            200: '#DDD6FE',
            700: '#6D28D9',
          },
        },
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'glass-xs': '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
        'glass-sm': '0 2px 6px 0 rgba(15, 23, 42, 0.06)',
        'glass-md': '0 4px 12px 0 rgba(15, 23, 42, 0.08)',
        'glass-xl': '0 20px 48px -12px rgba(15, 23, 42, 0.18)',
        'glass': '0 8px 32px 0 rgba(15, 23, 42, 0.08), 0 2px 8px 0 rgba(15, 23, 42, 0.04)',
        'glass-hover': '0 16px 40px 0 rgba(15, 23, 42, 0.12), 0 4px 12px 0 rgba(15, 23, 42, 0.06)',
        'pastel-blue': '0 8px 24px -4px rgba(37, 99, 235, 0.25)',
        'pastel-mint': '0 8px 24px -4px rgba(16, 185, 129, 0.25)',
        'pastel-coral': '0 8px 24px -4px rgba(244, 63, 94, 0.25)',
      },
    },
  },
  plugins: [],
};
