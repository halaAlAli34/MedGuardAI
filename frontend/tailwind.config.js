/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: "#0F6E56",
          50: "#E6F3F0",
          100: "#CCE7E0",
          200: "#99CFC1",
          300: "#66B7A3",
          400: "#339F84",
          500: "#0F6E56",
          600: "#0C5945",
          700: "#094334",
          800: "#062C22",
          900: "#031611"
        },
        warm: {
          bg: "#FBF8F3",
          card: "#FFFFFF",
          border: "#E8E1D5"
        },
        severity: {
          mild: "#B7791F",
          mildBg: "#FEF3DC",
          moderate: "#C05621",
          moderateBg: "#FDE8DA",
          severe: "#C53030",
          severeBg: "#FBE2E2"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      fontSize: {
        base: ["17px", "1.6"]
      }
    }
  },
  plugins: []
};
