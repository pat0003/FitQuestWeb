import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0D1117',
        card: '#161B22',
        input: '#1C2128',
        accent: '#7C3AED',
        'accent-cyan': '#06B6D4',
        'accent-gold': '#F59E0B',
        success: '#10B981',
        danger: '#EF4444',
        'text-primary': '#F0F6FC',
        'text-secondary': '#8B949E',
      },
    },
  },
  plugins: [],
} satisfies Config;
