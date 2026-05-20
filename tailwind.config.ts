import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fdf6f0',
        blush: '#f7c5b8',
        rose: '#e8a89a',
        terracotta: '#c9866f',
        espresso: '#4a3728',
        sand: '#f5ede8',
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        sans: ['system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
