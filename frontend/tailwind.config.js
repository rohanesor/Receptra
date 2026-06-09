/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0A0A0C',
          card: '#121216',
          border: '#1E1E24',
          text: '#F3F4F6',
          muted: '#9CA3AF'
        },
        gold: {
          light: '#F7E7C4',
          DEFAULT: '#D4AF37', // Barber classic gold
          dark: '#A6851E'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
