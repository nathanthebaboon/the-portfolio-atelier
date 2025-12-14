/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: "#d4af37",
        silver: "#cfd2d6",
        grey: "#f4f4f5",
      },
    },
  },
  plugins: [],
};
