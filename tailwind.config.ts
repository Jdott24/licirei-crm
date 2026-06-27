import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        lc: {
          bg:      '#0a0e2a',
          bg2:     '#0d1238',
          panel:   '#141a4d',
          panel2:  '#1a2160',
          sidebar: '#0c1138',
          slate:   '#4B5694',
          steel:   '#7288AE',
          cream:   '#EAE0CF',
          muted:   '#8e98c9',
          ok:      '#34D399',
          warn:    '#FBBF24',
          danger:  '#F87171',
        },
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        lcpulse: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(248,113,113,0.55)' },
          '50%':     { boxShadow: '0 0 0 5px rgba(248,113,113,0)' },
        },
      },
      animation: {
        lcpulse: 'lcpulse 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
