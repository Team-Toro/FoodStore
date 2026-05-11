import { cn } from '../lib/cn'

export interface ToolbarProps {
  /** Left slot: typically search / filter inputs */
  filters?: React.ReactNode
  /** Right slot: typically action buttons (e.g. export, bulk actions) */
  actions?: React.ReactNode
  className?: string
}

/**
 * Page toolbar with filter slot (left) and action slot (right).
 * Stacks vertically on mobile, inline on sm+.
 *
 * @example
 * <Toolbar
 *   filters={
 *     <>
 *       <Input placeholder="Buscar..." value={q} onChange={...} />
 *       <Select value={rol} onChange={...}>...</Select>
 *     </>
 *   }
 *   actions={<Button onClick={openCreate}>+ Nuevo</Button>}
 * />
 */
export function Toolbar({ filters, actions, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4',
        className,
      )}
    >
      {filters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters}
        </div>
      )}

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
