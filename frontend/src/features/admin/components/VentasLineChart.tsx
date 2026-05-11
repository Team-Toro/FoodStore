// redesigned in us-009 — Phase 6
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { Card } from '../../../shared/ui/Card'
import { Button } from '../../../shared/ui/Button'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { BarChart2 } from 'lucide-react'
import { useChartTheme } from '../hooks/useChartTheme'
import type { VentasPorPeriodo, VentasParams } from '../../../api/admin'

interface VentasLineChartProps {
  data: VentasPorPeriodo[]
  params: VentasParams
  onParamsChange: (p: VentasParams) => void
  loading?: boolean
}

const GRANULARIDADES: Array<{ value: 'day' | 'week' | 'month'; label: string }> = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
]

function formatPeriodo(raw: string, granularidad?: string): string {
  if (!raw) return raw
  try {
    const d = new Date(raw)
    if (granularidad === 'month') {
      return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
    }
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  } catch {
    return raw
  }
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------
function VentasTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value
  return (
    <Card variant="elevated" className="p-3 text-sm shadow-lg">
      <p className="text-fg-muted mb-0.5">{label}</p>
      <p className="font-semibold text-fg">
        ${(value as number).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
      </p>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// VentasLineChart
// ---------------------------------------------------------------------------
export function VentasLineChart({
  data,
  params,
  onParamsChange,
  loading = false,
}: VentasLineChartProps): JSX.Element {
  const theme = useChartTheme()
  const granularidad = params.granularidad ?? 'day'
  const chartData = data.map((d) => ({
    ...d,
    label: formatPeriodo(d.periodo, granularidad),
  }))

  return (
    <Card variant="elevated" className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-fg">Ventas por período</h2>
        <div className="flex gap-1">
          {GRANULARIDADES.map((g) => (
            <Button
              key={g.value}
              size="sm"
              variant={granularidad === g.value ? 'primary' : 'secondary'}
              onClick={() => onParamsChange({ ...params, granularidad: g.value })}
              className="text-xs px-2.5 py-1"
            >
              {g.label}
            </Button>
          ))}
        </div>
      </div>

      {loading && <Skeleton height="h-[220px]" />}

      {!loading && chartData.length === 0 && (
        <EmptyState
          icon={BarChart2}
          title="Sin datos"
          description="No hay ventas registradas para el período seleccionado."
          className="py-8"
        />
      )}

      {!loading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
            <XAxis
              dataKey="label"
              tick={{ fill: theme.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: theme.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${v.toLocaleString('es-AR')}`}
            />
            <Tooltip content={<VentasTooltip />} />
            <Line
              type="monotone"
              dataKey="total"
              stroke={theme.brand}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: theme.brand }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
