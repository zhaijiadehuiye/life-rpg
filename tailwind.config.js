/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#efece5',
          900: '#f5f3ee',
          850: '#ffffff',
          800: '#f7f6f2',
          700: '#efede6',
          600: '#e6e3da',
        },
        line: {
          DEFAULT: 'rgba(28,27,26,0.08)',
          strong: 'rgba(28,27,26,0.14)',
        },
        accent: {
          DEFAULT: '#5f8f73',
          dim: '#4a735c',
          glow: 'rgba(95,143,115,0.16)',
        },
        mint: '#dcebd8',
        lav: '#e9e3f3',
        peach: '#f8e4cf',
        sky: '#dbe8f4',
        gold: {
          DEFAULT: '#c99a4a',
          dim: '#a67f3a',
        },
        danger: {
          DEFAULT: '#d06a6a',
          dim: '#b05353',
        },
        warn: {
          DEFAULT: '#cf9a3f',
        },
        good: {
          DEFAULT: '#6fae7e',
        },
        muted: '#8b8880',
      },
      fontFamily: {
        sans: ['"Onest"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        display: ['"Onest"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(95,143,115,0.2), 0 8px 24px rgba(95,143,115,0.12)',
        card: '0 1px 2px rgba(28,27,26,0.04), 0 12px 32px rgba(28,27,26,0.06)',
        soft: '0 2px 8px rgba(28,27,26,0.05)',
        badge: '0 4px 14px rgba(95,143,115,0.3)',
      },
      borderRadius: {
        xl2: '22px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
