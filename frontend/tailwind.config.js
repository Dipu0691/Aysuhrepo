/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./*.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#0f172a', // Deep Navy
                secondary: '#c5a059', // Muted Gold
                accent: '#e2e8f0', // Slate Light
                dark: '#020617',
                light: '#f8fafc'
            },
            fontFamily: {
                serif: ['"Playfair Display"', 'serif'],
                sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            },
            animation: {
                'kenburns': 'kenburns 20s ease-out infinite alternate',
                'gradient-x': 'gradient-x 3s ease infinite',
                'spin-slow': 'spin 15s linear infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                kenburns: {
                    '0%': { transform: 'scale(1) translate(0, 0)' },
                    '100%': { transform: 'scale(1.1) translate(-2%, -2%)' },
                },
                'gradient-x': {
                    '0%, 100%': {
                        'background-size': '200% 200%',
                        'background-position': 'left center',
                    },
                    '50%': {
                        'background-size': '200% 200%',
                        'background-position': 'right center',
                    },
                }
            }
        },
    },
    plugins: [],
}
