import { useMemo } from 'react'

/**
 * Reads CSS design tokens from :root and exposes a memoized theme object
 * for use with Recharts. All values come from the project's token system
 * so charts stay in sync with theme changes automatically.
 */
export function useChartTheme() {
  return useMemo(() => {
    const style = getComputedStyle(document.documentElement)
    const get = (v: string) => style.getPropertyValue(v).trim()

    return {
      /** Primary series color (brand amber-orange) */
      brand: get('--brand-500'),
      /** Secondary series color (accent teal) */
      accent: get('--accent-500'),
      /** Light fill for area charts */
      brandLight: get('--brand-200'),
      accentLight: get('--accent-200'),
      /** Status colors */
      success: get('--success'),
      warning: get('--warning'),
      danger: get('--danger'),
      info: get('--info'),
      /** Grid lines */
      grid: get('--border'),
      /** Axis tick labels */
      axis: get('--fg-muted'),
      /** Tooltip styling */
      tooltip: {
        bg: get('--bg'),
        border: get('--border'),
        text: get('--fg'),
      },
    }
  }, [])
}
