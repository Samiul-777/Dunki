/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F2A43',
          50: '#EBF0F5',
          100: '#CFDBE6',
          400: '#3E5F7D',
          600: '#1A3A56',
          900: '#081925'
        },
        paper: {
          DEFAULT: '#EEF0EA',
          50: '#F7F8F4',
          100: '#F6F3EC'
        },
        stamp: {
          DEFAULT: '#C89B3C',
          light: '#E4C36C',
          dark: '#9C7726'
        },
        verified: '#1F7A5C',
        alert: '#B23A2E'
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', '"Noto Sans Bengali"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      borderRadius: {
        card: '10px'
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(15,42,67,0.06) 1px, transparent 0)"
      },
      backgroundSize: {
        grain: '18px 18px'
      }
    }
  },
  plugins: []
}
