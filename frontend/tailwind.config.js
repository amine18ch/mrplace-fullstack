export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          night: '#0A1F44',
          navy: '#1E3A8A',
          primary: '#2563EB',
          vivid: '#3B82F6',
          light: '#60A5FA',
          soft: '#DBEAFE',
          pastel: '#EFF6FF',
          sky: '#BFDBFE',
        },
      },
      fontFamily: { sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
