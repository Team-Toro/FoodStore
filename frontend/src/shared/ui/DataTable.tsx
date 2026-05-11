import { cn } from '../lib/cn'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'
import { type LucideIcon } from 'lucide-react'

export interface DataTableColumn<T> {
  /** Column header label */
  header: string
  /** Key in row data or render function */
  render: (row: T) => React.ReactNode
  /** Additional class names for the header th */
  headerClassName?: string
  /** Additional class names for each td */
  cellClassName?: string
  /** Whether this column is right-aligned */
  align?: 'left' | 'center' | 'right'
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  /** Key extractor for React list reconciliation */
  keyExtractor: (row: T) => string | number
  loading?: boolean
  /** Number of skeleton rows to show while loading (default: 5) */
  skeletonRows?: number
  /** Empty state configuration */
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  className?: string
}

/**
 * Reusable data table with sticky header, zebra rows, loading skeleton,
 * and empty state. Accepts generic row type.
 *
 * @example
 * <DataTable
 *   columns={[
 *     { header: 'Nombre', render: (r) => r.nombre },
 *     { header: 'Precio', render: (r) => `$${r.precio}`, align: 'right' },
 *   ]}
 *   data={productos}
 *   keyExtractor={(r) => r.id}
 *   loading={isLoading}
 * />
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  skeletonRows = 5,
  emptyIcon,
  emptyTitle = 'No hay datos',
  emptyDescription,
  emptyAction,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('rounded-card border border-border overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Sticky header */}
          <thead className="sticky top-0 z-10 bg-bg-subtle border-b border-border">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold text-fg-muted uppercase tracking-wide whitespace-nowrap',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    !col.align && 'text-left',
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-bg divide-y divide-border">
            {/* Loading state */}
            {loading &&
              Array.from({ length: skeletonRows }).map((_, rowIdx) => (
                <tr key={`skeleton-${rowIdx}`}>
                  {columns.map((_, colIdx) => (
                    <td key={colIdx} className="px-4 py-3">
                      <Skeleton height="h-5" width={colIdx === 0 ? 'w-40' : 'w-24'} />
                    </td>
                  ))}
                </tr>
              ))}

            {/* Empty state */}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            )}

            {/* Data rows — zebra via even */}
            {!loading &&
              data.map((row, rowIdx) => (
                <tr
                  key={keyExtractor(row)}
                  className={cn(
                    'hover:bg-bg-subtle/70 transition-colors duration-base',
                    rowIdx % 2 === 1 && 'bg-bg-subtle/40',
                  )}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={cn(
                        'px-4 py-3 text-fg',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.cellClassName,
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
