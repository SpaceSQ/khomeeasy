import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F3EE',
        ink: '#1C1917',
        muted: '#3F3A36',
        brass: '#6B4423',
        line: '#D9D2C8'
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif']
      },
      maxWidth: {
        page: '72rem'
      }
    }
  },
  plugins: []
};

export default config;
