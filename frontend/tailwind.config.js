// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  // tailwind.config.js
theme: {
  extend: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
    },
    colors: {
      accent: '#2563EB',      // blue-600
      accentLite: '#3B82F6',  // blue-500
    },
    animation: {
      blob: 'blob 7s infinite',
    },
    keyframes: {
      blob: {
        '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
        '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
        '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
      },
    },
  },
},
  plugins: [],
};
