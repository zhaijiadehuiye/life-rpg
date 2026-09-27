/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0b0f',
          900: '#0f1117',
          850: '#141720',
          800: '#1a1e29',
          700: '#242938',
          600: '#323849',
        },
        line: {
          DEFAULT: 'rgba(255,255,255,0.07)',
          strong: 'rgba(255,255,255,0.12)',
        },
        accent: {
          DEFAULT: '#3dd6c3',
          dim: '#2aa898',
          glow: 'rgba(61,214,195,0.18)',
        },
        gold: { DEFAULT: '#e0b866', dim: '#b89448' },
        danger: { DEFAULT: '#e06c75', dim: '#b85460' },
        warn: { DEFAULT: '#d8a24a' },
        good: { DEFAULT: '#7fc97f' },
        muted: '#8a90a2',
      },
      fontFamily: {
        sans: ['"Inter"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(61,214,195,0.25), 0 0 24px rgba(61,214,195,0.12)',
        card: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px rgba(0,0,0,0.35)',
      },
      borderRadius: { xl2: '14px' },
    },
  },
  plugins: [],
}
