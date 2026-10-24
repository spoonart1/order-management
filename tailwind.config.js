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
        alora: {
          ink: "#1B2225",       // Deep Charcoal Ink dari logo
          canvas: "#F8F6F1",    // Warm Alabaster Canvas
          card: "#FFFFFF",      // Clean Surface
          border: "#E5E0D6",    // Muted Stone Hairline Border
          sand: "#968363",      // Warm Brass & Sand Accent
          sandLight: "#F2EDE4", // Subtle Sand Tint
          darkBg: "#111517",    // Dark Slate Onyx
          darkCard: "#191F22",  // Dark Slate Card
          darkBorder: "#273136",// Dark Slate Border
        },
        brand: {
          red: "#B91C1C", // Warna merah Alora
          dark: "#1B2225",
          card: "#191F22",
        },
      },
      borderRadius: {
        'arch': '4px',
        'arch-sm': '2px',
      },
    },
  },
  plugins: [],
};