/**
 * computeForbiddenParents
 *
 * Returns the set of category IDs that MUST NOT be chosen as the parent of
 * `categoryId`, because doing so would create a cycle in the category tree.
 *
 * The forbidden set contains:
 *   1. The category itself (a category cannot be its own parent).
 *   2. All descendants of the category (any child, grandchild, etc.) —
 *      making one of them the parent would create a cycle.
 *
 * @param categoryId   The ID of the category being edited (can be null for a
 *                     new category — in that case an empty Set is returned).
 * @param allCategories A flat array of all categories, each with { id, padre_id }.
 * @returns A Set<number> of forbidden IDs.
 */
export function computeForbiddenParents(
  categoryId: number | null,
  allCategories: { id: number; padre_id: number | null }[],
): Set<number> {
  if (categoryId === null) return new Set<number>()

  const forbidden = new Set<number>()
  forbidden.add(categoryId)

  // BFS / iterative DFS to collect all descendants
  const queue: number[] = [categoryId]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const cat of allCategories) {
      if (cat.padre_id === current && !forbidden.has(cat.id)) {
        forbidden.add(cat.id)
        queue.push(cat.id)
      }
    }
  }

  return forbidden
}
