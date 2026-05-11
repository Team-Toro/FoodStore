import { describe, it, expect } from 'vitest'
import { computeForbiddenParents } from '../features/admin/lib/computeForbiddenParents'

// Sample tree:
//   1 (root)
//   ├── 2
//   │   ├── 4
//   │   └── 5
//   └── 3
//   6 (another root)

const allCategories = [
  { id: 1, padre_id: null },
  { id: 2, padre_id: 1 },
  { id: 3, padre_id: 1 },
  { id: 4, padre_id: 2 },
  { id: 5, padre_id: 2 },
  { id: 6, padre_id: null },
]

describe('computeForbiddenParents', () => {
  it('returns empty set for null categoryId (new category)', () => {
    const result = computeForbiddenParents(null, allCategories)
    expect(result.size).toBe(0)
  })

  it('forbids self', () => {
    const result = computeForbiddenParents(1, allCategories)
    expect(result.has(1)).toBe(true)
  })

  it('forbids direct children', () => {
    const result = computeForbiddenParents(1, allCategories)
    expect(result.has(2)).toBe(true)
    expect(result.has(3)).toBe(true)
  })

  it('forbids grandchildren', () => {
    const result = computeForbiddenParents(1, allCategories)
    expect(result.has(4)).toBe(true)
    expect(result.has(5)).toBe(true)
  })

  it('does not forbid unrelated categories', () => {
    const result = computeForbiddenParents(1, allCategories)
    expect(result.has(6)).toBe(false)
  })

  it('leaf node only forbids itself', () => {
    const result = computeForbiddenParents(4, allCategories)
    expect(result).toEqual(new Set([4]))
  })

  it('forbids only self and own subtree, not siblings', () => {
    const result = computeForbiddenParents(2, allCategories)
    // 2 and its children (4, 5) are forbidden
    expect(result).toEqual(new Set([2, 4, 5]))
    // parent (1) and sibling (3) are allowed
    expect(result.has(1)).toBe(false)
    expect(result.has(3)).toBe(false)
  })

  it('handles empty category list', () => {
    const result = computeForbiddenParents(1, [])
    expect(result).toEqual(new Set([1]))
  })
})
