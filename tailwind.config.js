/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#61F800',
          hover: '#4ed200',
        },
        bg: {
          body: '#000000',
          sidebar: '#0a0a0a',
          card: '#111111',
        },
        'card-border': 'rgba(97, 248, 0, 0.2)',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
      transitionProperty: {
        'size': 'width, height',
      }
    },
  },
  plugins: [],
};
