import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '../lib/cn'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageHeaderProps {
  /** Page title (h1) */
  title: string
  /** Optional description below the title */
  description?: string
  /** Breadcrumb items rendered above the title */
  breadcrumb?: BreadcrumbItem[]
  /** Slot for action buttons (rendered right-aligned) */
  actions?: React.ReactNode
  className?: string
}

/**
 * Consistent page header with title, optional breadcrumb, and actions slot.
 *
 * @example
 * <PageHeader
 *   title="Productos"
 *   breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Productos' }]}
 *   actions={<Button onClick={openCreate}>+ Nuevo producto</Button>}
 * />
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-1">
          <ol className="flex items-center gap-1 text-xs text-fg-muted">
            {breadcrumb.map((item, i) => (
              <Fragment key={i}>
                {i > 0 && <ChevronRight className="h-3 w-3 text-fg-subtle" aria-hidden="true" />}
                <li>
                  {item.href ? (
                    <a href={item.href} className="hover:text-fg transition-colors">
                      {item.label}
                    </a>
                  ) : (
                    <span className="text-fg">{item.label}</span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      )}

      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg leading-tight">{title}</h1>
          {description && (
            <p className="text-sm text-fg-muted mt-0.5">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
