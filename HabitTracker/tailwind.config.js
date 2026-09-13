/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#111111',
        surface: '#1C1C1F',
        surfaceElevated: '#27272A',
        textPrimary: '#FFFFFF',
        textSecondary: '#B5B5B5',
        textMuted: '#707070',
        accentLime: '#C7F464',
        accentPurple: '#A855F7',
        accentOrange: '#FF7849',
        accentSky: '#5AC8FA',
        accentPink: '#FF5DA2',
        accentYellow: '#FFD93D',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
