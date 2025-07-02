/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          light: '#faf7f2',
          medium: '#f4ede4',
          dark: '#e8dcc6',
        },
        rose: {
          light: '#f8e8e8',
          medium: '#e6b3b3',
          dark: '#d4a4a4',
        },
        sage: {
          light: '#e8f0e8',
          medium: '#a7b69b',
          dark: '#8fa183',
        },
        gold: {
          light: '#fcf3d0',
          medium: '#f5d66c',
          dark: '#d39921',
        },
        pearl: {
          light: '#faf5ec',
          medium: '#f0e2c9',
          dark: '#c7ad7c',
        }
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['Inter', 'sans-serif']
      },
      animation: {
        'bounce-custom': 'bounce 0.6s ease-in-out',
        'slide-up': 'slideInUp 0.5s ease-out',
        'pulse-custom': 'pulse 0.3s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        slideInUp: {
          'from': { transform: 'translateY(20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ],
}