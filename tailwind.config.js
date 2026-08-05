/** @type {import('tailwindcss').Config} */

/* The "LE BOOK" direction: a printed agency book. Near-black ground, warm
   off-white ink, one vermillion accent reserved for the active state. The
   secondary text tones are named by opacity because the design specifies them
   that way — every rule in the doc is rgba(242,240,236,x) over #0A0A0A. */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0A',
        frame: '#151515',
        bone: {
          DEFAULT: '#F2F0EC',
          // Measured on #0A0A0A: 60% lands at 6.1:1, comfortably past the
          // 4.5:1 AA floor for body copy. The doc's .42–.45 captions were
          // 3.4:1, which is why they are raised here.
          muted: 'rgba(242, 240, 236, 0.62)',
          faint: 'rgba(242, 240, 236, 0.16)',
          hair: 'rgba(242, 240, 236, 0.12)',
        },
        vermillon: '#E4462C',
        // Kept: the admin panel is a light working surface, not part of the
        // book, and its greys come from here.
        primary: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        // The admin's action colour, realigned from violet onto the book's
        // accent so the two surfaces read as one product.
        accent: {
          400: '#EC6A54',
          500: '#E4462C',
          600: '#C2361F',
        },
      },
      fontFamily: {
        // 'Playfair Display' carries Cyrillic only — see the scoped
        // unicode-range in index.css. Bodoni Moda ships latin alone and the
        // subtitle is "диво дьявола • Life is but a dream".
        sans: ['Archivo', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['Bodoni Moda', 'Playfair Display', 'Georgia', 'serif'],
        display: ['Bodoni Moda', 'Playfair Display', 'Georgia', 'serif'],
      },
      fontSize: {
        // The doc's typographic scale, as clamps so 390 → 1920 is one ramp.
        display: ['clamp(3.5rem, 9.6vw, 9.375rem)', { lineHeight: '0.84', letterSpacing: '-0.018em' }],
        'section-title': ['clamp(2.5rem, 5vw, 4.75rem)', { lineHeight: '0.9', letterSpacing: '-0.015em' }],
        'display-sm': ['clamp(2rem, 3.4vw, 2.75rem)', { lineHeight: '1.05', letterSpacing: '-0.01em' }],
        caption: ['0.594rem', { lineHeight: '1.3', letterSpacing: '0.2em' }],
        micro: ['0.625rem', { lineHeight: '1.3', letterSpacing: '0.22em' }],
        // Referenced by the login form and the admin header since before this
        // refonte, but never actually defined — so they resolved to nothing.
        'body-sm': ['0.8125rem', { lineHeight: '1.6' }],
        'body-md': ['0.90625rem', { lineHeight: '1.75' }],
      },
      letterSpacing: {
        wordmark: '0.44em',
        micro: '0.22em',
        caption: '0.2em',
      },
      borderRadius: {
        // The book has no rounded corners. Kept as a token so the admin's
        // existing rounded-elegant usages resolve to a square edge instead of
        // needing a rename across every panel.
        elegant: '0',
      },
      transitionTimingFunction: {
        book: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        rise: 'rise 900ms cubic-bezier(0.16, 1, 0.3, 1) both',
        spin: 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
