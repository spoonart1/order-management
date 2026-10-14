/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tambahkan ./App.{js,jsx,ts,tsx} dan ./src jika ada
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#B91C1C", // Warna merah Alora
          dark: "#0F172A",
          card: "#1E293B",
        },
      },
    },
  },
  plugins: [],
};