/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        logtudo: {
          primary: '#185772',    // Azul/Teal Escuro Oficial Logtudo
          accent: '#6ca8c2',     // Azul/Teal Claro Oficial Logtudo
          neutral: '#757675',    // Cinza Neutro Oficial Logtudo
          deep: '#0F2C3A',       // Fundo escuro institucional profundo
          surface: '#13394A',    // Superfície de cards e gavetas
          border: '#1E4D63',     // Bordas institucionais
          hover: '#14465C',      // Hover primário
        },
        status: {
          disponivel: {
            bg: '#ECFDF5',
            text: '#047857',
            border: '#A7F3D0',
          },
          programado: {
            bg: '#EFF6FF',
            text: '#1D4ED8',
            border: '#BFDBFE',
          },
          em_rota: {
            bg: '#FFFBEB',
            text: '#B45309',
            border: '#FDE68A',
          },
          indisponivel: {
            bg: '#FEF2F2',
            text: '#B91C1C',
            border: '#FCA5A5',
          },
        },
      },
    },
  },
  plugins: [],
}
