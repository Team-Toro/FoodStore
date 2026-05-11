/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // ---- Colors ----------------------------------------
      colors: {
        // Brand scale (amber-orange)
        brand: {
          50:  'var(--brand-50)',
          100: 'var(--brand-100)',
          200: 'var(--brand-200)',
          300: 'var(--brand-300)',
          400: 'var(--brand-400)',
          500: 'var(--brand-500)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
          800: 'var(--brand-800)',
          900: 'var(--brand-900)',
        },
        // Accent scale (teal)
        accent: {
          50:  'var(--accent-50)',
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          800: 'var(--accent-800)',
          900: 'var(--accent-900)',
        },
        // Semantic backgrounds
        bg: {
          DEFAULT:  'var(--bg)',
          subtle:   'var(--bg-subtle)',
          elevated: 'var(--bg-elevated)',
          overlay:  'var(--bg-overlay)',
        },
        // Semantic foregrounds
        fg: {
          DEFAULT:  'var(--fg)',
          muted:    'var(--fg-muted)',
          subtle:   'var(--fg-subtle)',
          'on-brand': 'var(--fg-on-brand)',
        },
        // Borders
        border: {
          DEFAULT: 'var(--border)',
          strong:  'var(--border-strong)',
        },
        // Focus ring
        ring: 'var(--ring)',
        // Status colors
        success: {
          DEFAULT: 'var(--success)',
          bg:      'var(--success-bg)',
          fg:      'var(--success-fg)',
          50:      'var(--success-50)',
          100:     'var(--success-100)',
          200:     'var(--success-200)',
          300:     'var(--success-300)',
          400:     'var(--success-400)',
          500:     'var(--success-500)',
          600:     'var(--success-600)',
          700:     'var(--success-700)',
          800:     'var(--success-800)',
          900:     'var(--success-900)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          bg:      'var(--warning-bg)',
          fg:      'var(--warning-fg)',
          50:      'var(--warning-50)',
          100:     'var(--warning-100)',
          200:     'var(--warning-200)',
          300:     'var(--warning-300)',
          400:     'var(--warning-400)',
          500:     'var(--warning-500)',
          600:     'var(--warning-600)',
          700:     'var(--warning-700)',
          800:     'var(--warning-800)',
          900:     'var(--warning-900)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          bg:      'var(--danger-bg)',
          fg:      'var(--danger-fg)',
          50:      'var(--danger-50)',
          100:     'var(--danger-100)',
          200:     'var(--danger-200)',
          300:     'var(--danger-300)',
          400:     'var(--danger-400)',
          500:     'var(--danger-500)',
          600:     'var(--danger-600)',
          700:     'var(--danger-700)',
          800:     'var(--danger-800)',
          900:     'var(--danger-900)',
        },
        info: {
          DEFAULT: 'var(--info)',
          bg:      'var(--info-bg)',
          fg:      'var(--info-fg)',
          50:      'var(--info-50)',
          100:     'var(--info-100)',
          200:     'var(--info-200)',
          300:     'var(--info-300)',
          400:     'var(--info-400)',
          500:     'var(--info-500)',
          600:     'var(--info-600)',
          700:     'var(--info-700)',
          800:     'var(--info-800)',
          900:     'var(--info-900)',
        },
      },

      // ---- Border Radius ---------------------------------
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
        full: 'var(--radius-full)',
        // Semantic aliases
        btn:    'var(--radius-md)',
        card:   'var(--radius-lg)',
        input:  'var(--radius-md)',
        badge:  'var(--radius-full)',
        dialog: 'var(--radius-xl)',
      },

      // ---- Box Shadows -----------------------------------
      boxShadow: {
        card:    'var(--shadow-card)',
        popover: 'var(--shadow-popover)',
        modal:   'var(--shadow-modal)',
        brand:   'var(--shadow-brand)',
      },

      // ---- Font Families ---------------------------------
      fontFamily: {
        sans:    ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono:    ['var(--font-mono)'],
      },

      // ---- Transition Duration ---------------------------
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },

      // ---- Transition Timing Functions -------------------
      transitionTimingFunction: {
        'ease-out':    'var(--ease-out)',
        'ease-in':     'var(--ease-in)',
        'ease-in-out': 'var(--ease-in-out)',
        'ease-spring': 'var(--ease-spring)',
      },

      // ---- Ring color (focus rings) ----------------------
      ringColor: {
        DEFAULT: 'var(--ring)',
        brand:   'var(--brand-500)',
      },
    },
  },
  plugins: [],
}
