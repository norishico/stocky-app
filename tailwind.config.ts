import type { Config } from 'tailwindcss'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const daisyui = require('daisyui')

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Stocky ブランドカラー
        forest: {
          50:  '#f0faf4',
          100: '#dcf4e6',
          500: '#2D6A4F',
          600: '#1B4332',
          700: '#143325',
        },
        cream: '#FAFAF5',
        amber: {
          400: '#FBBF24',
          500: '#D97706',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'Hiragino Sans', 'Yu Gothic', 'sans-serif'],
        round: ['Zen Maru Gothic', 'Hiragino Sans', 'sans-serif'],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        stocky: {
          primary: '#2D6A4F',
          'primary-content': '#ffffff',
          secondary: '#D97706',
          'secondary-content': '#ffffff',
          accent: '#40916C',
          neutral: '#1C1917',
          'base-100': '#FAFAF5',
          'base-200': '#F0F0E8',
          'base-300': '#E5E5D8',
          'base-content': '#1C1917',
          info: '#3B82F6',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        },
      },
    ],
    darkTheme: false,
    base: true,
    styled: true,
    utils: true,
  },
}

export default config
