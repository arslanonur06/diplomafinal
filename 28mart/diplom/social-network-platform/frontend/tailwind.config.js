/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        'float-emoji': {
          '0%': { transform: 'translateY(100vh) scale(0.8) rotate(-15deg)', opacity: '0' },
          '10%': { opacity: '0.8', transform: 'translateY(80vh) scale(0.9) rotate(5deg)' },
          '30%': { transform: 'translateY(60vh) scale(1) rotate(-5deg)' },
          '50%': { transform: 'translateY(40vh) scale(1.1) rotate(10deg)' },
          '70%': { transform: 'translateY(20vh) scale(1.1) rotate(-10deg)', opacity: '0.8' },
          '90%': { opacity: '0.6', transform: 'translateY(10vh) scale(1) rotate(5deg)' },
          '100%': { transform: 'translateY(-20px) scale(0.9) rotate(0deg)', opacity: '0' }
        }
      },
      animation: {
        'float-emoji': 'float-emoji 8s ease-in-out forwards'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
