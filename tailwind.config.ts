import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#016871',
        mist: '#fdfdfd',
        ember: '#ffff79',
        spruce: '#00a294',
        night: '#016871',
        roseclay: '#74e2d8',
        lime: '#b9ff9c',
        surface: '#fdfdfd',
      },
      boxShadow: {
        panel: '0 18px 48px rgba(1, 104, 113, 0.14)',
      },
    },
  },
  plugins: [],
} satisfies Config