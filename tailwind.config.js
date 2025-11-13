/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ultra: {
          black: "#000000",
          card: "#111111",
          cardAlt: "#181818",
          accent: "#F56300",
          accentHover: "#CC4E00",
          accentPressed: "#A84100",
          border: "#2A2A2A",
          positive: "#32D74B",
          negative: "#FF453A",
        },
      },
      borderRadius: {
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

