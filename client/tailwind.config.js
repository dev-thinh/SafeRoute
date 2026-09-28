/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        safe: {
          500: '#10B981',
          600: '#059669',
        },
        flood: {
          light: '#FDE047',
          medium: '#FB923C',
          severe: '#EF4444',
        },
      },
    },
  },
  plugins: [],
};
