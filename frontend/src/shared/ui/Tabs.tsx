import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '../lib/cn'

// ---- Context ----

interface TabsContextValue {
  activeTab: string
  setActiveTab: (id: string) => void
  baseId: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs sub-components must be used inside <Tabs>')
  return ctx
}

// ---- Root ----

export interface TabsProps {
  /** The initially active tab id */
  defaultTab?: string
  /** Controlled active tab id */
  value?: string
  /** Called when the active tab changes (controlled mode) */
  onChange?: (tab: string) => void
  children: ReactNode
  className?: string
}

export function Tabs({ defaultTab, value, onChange, children, className }: TabsProps) {
  const baseId = useId()
  const [internalTab, setInternalTab] = useState(defaultTab ?? '')

  const activeTab = value ?? internalTab
  const setActiveTab = (id: string) => {
    setInternalTab(id)
    onChange?.(id)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, baseId }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

// ---- TabList ----

export function TabList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex border-b border-border overflow-x-auto',
        className
      )}
    >
      {children}
    </div>
  )
}

// ---- Tab trigger ----

export interface TabProps {
  id: string
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function Tab({ id, children, className, disabled = false }: TabProps) {
  const { activeTab, setActiveTab, baseId } = useTabsContext()
  const isActive = activeTab === id

  return (
    <button
      role="tab"
      id={`${baseId}-tab-${id}`}
      aria-controls={`${baseId}-panel-${id}`}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => setActiveTab(id)}
      className={cn(
        'relative shrink-0 px-4 py-2.5 text-sm font-medium',
        'transition-colors duration-base',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? [
              'text-brand-600',
              'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand-500',
            ]
          : 'text-fg-muted hover:text-fg',
        className
      )}
    >
      {children}
    </button>
  )
}

// ---- TabPanel ----

export interface TabPanelProps {
  id: string
  children: ReactNode
  className?: string
  /** If true the panel is always mounted (for perf); default unmounts when inactive */
  keepMounted?: boolean
}

export function TabPanel({ id, children, className, keepMounted = false }: TabPanelProps) {
  const { activeTab, baseId } = useTabsContext()
  const isActive = activeTab === id

  if (!keepMounted && !isActive) return null

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${id}`}
      aria-labelledby={`${baseId}-tab-${id}`}
      hidden={!isActive}
      tabIndex={0}
      className={cn(
        'outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md',
        className
      )}
    >
      {children}
    </div>
  )
}
