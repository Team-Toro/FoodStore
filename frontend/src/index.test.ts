/**
 * Token resolution tests (task 1.6)
 *
 * Verifies that the Tailwind config contains the nested color scale entries
 * for success, warning, danger, and info — ensuring bg-success-500 etc. map
 * to the correct CSS custom properties and are not undefined.
 */

import tailwindConfig from '../tailwind.config.js'
import { describe, it, expect } from 'vitest'

// Pull the nested colors from the config
const colors = (tailwindConfig as any).theme.extend.colors

describe('Design token color scales in Tailwind config', () => {
  const scales = ['success', 'warning', 'danger', 'info'] as const

  scales.forEach((scale) => {
    describe(`${scale} color scale`, () => {
      it('has a 500 step that maps to the CSS variable', () => {
        expect(colors[scale]).toBeDefined()
        expect(colors[scale][500]).toBe(`var(--${scale}-500)`)
      })

      it('has 50-900 steps defined', () => {
        const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
        steps.forEach((step) => {
          expect(colors[scale][step]).toBe(
            `var(--${scale}-${step})`,
            `Expected ${scale}-${step} to map to var(--${scale}-${step})`
          )
        })
      })

      it('retains DEFAULT, bg, and fg aliases', () => {
        expect(colors[scale].DEFAULT).toBe(`var(--${scale})`)
        expect(colors[scale].bg).toBe(`var(--${scale}-bg)`)
        expect(colors[scale].fg).toBe(`var(--${scale}-fg)`)
      })
    })
  })
})
