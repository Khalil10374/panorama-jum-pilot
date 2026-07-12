export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        lagoon: "#0f766e",
        sun: "#f59e0b",
        coral: "#e11d48",
        leaf: "#16a34a",
        ink: "#172033"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 32, 51, 0.08)",
        lift: "0 24px 70px rgba(15, 118, 110, 0.16)"
      }
    }
  },
  plugins: []
};
