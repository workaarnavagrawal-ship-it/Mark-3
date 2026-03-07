/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:     '#050506',
        s1:     '#0A0A0C',
        s2:     '#0F0F12',
        s3:     '#141418',
        s4:     '#1A1A1F',
        b:      '#1C1C22',
        'b-strong': '#2A2A32',
        t:      '#E8E6E1',
        t2:     '#9B9A95',
        t3:     '#5C5B57',
        acc:    '#00E5C7',
        'acc-h': '#33EEDD',
        'acc-dim': '#00E5C720',
        safe:   { bg: '#0A1F12', t: '#4ADE80', b: '#1A3D24' },
        tgt:    { bg: '#1F1A0A', t: '#FACC15', b: '#3D3415' },
        rch:    { bg: '#1F0A0A', t: '#F87171', b: '#3D1515' },
      },
      fontFamily: {
        serif:  ['var(--font-garamond)', 'EB Garamond', 'Georgia', 'serif'],
        mono:   ['var(--font-jetbrains)', 'JetBrains Mono', 'SF Mono', 'monospace'],
        sans:   ['var(--font-dm)', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        panel: '16px',
        'panel-lg': '20px',
      },
      boxShadow: {
        panel: '0 4px 24px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
        deep:  '0 8px 40px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)',
        glow:  '0 0 40px rgba(0,229,199,0.07), 0 0 80px rgba(0,229,199,0.07)',
      },
      animation: {
        'slide-up': 'slide-up 350ms ease forwards',
        'slide-right': 'slide-right 300ms ease forwards',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
      width: {
        sidebar: '240px',
        rail: '280px',
      },
    },
  },
  plugins: [],
};
