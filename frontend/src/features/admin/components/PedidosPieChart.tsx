// redesigned in us-009 — Phase 6
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { Card } from '../../../shared/ui/Card'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { PieChart as PieChartIcon } from 'lucide-react'
import { useChartTheme } from '../hooks/useChartTheme'
import type { PedidosPorEstado } from '../../../api/admin'

interface PedidosPieChartProps {
  data: PedidosPorEstado[]
  loading?: boolean
}

/** Maps each order estado to the corresponding useChartTheme property key. */
const ESTADO_COLOR_KEYS: Record<string, 'warning' | 'info' | 'brand' | 'accent' | 'success' | 'danger'> = {
  PENDIENTE:  'warning',
  CONFIRMADO: 'info',
  EN_PREP:    'brand',
  EN_CAMINO:  'accent',
  ENTREGADO:  'success',
  CANCELADO:  'danger',
}

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE:  'Pendiente',
  CONFIRMADO: 'Confirmado',
  EN_PREP:    'En prep.',
  EN_CAMINO:  'En camino',
  ENTREGADO:  'Entregado',
  CANCELADO:  'Cancelado',
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------
function PieTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <Card variant="elevated" className="p-3 text-sm shadow-lg">
      <p className="text-fg-muted mb-0.5">{entry?.name}</p>
      <p className="font-semibold text-fg">{entry?.value} pedidos</p>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// PedidosPieChart
// ---------------------------------------------------------------------------
export function PedidosPieChart({ data, loading = false }: PedidosPieChartProps): JSX.Element {
  const theme = useChartTheme()

  // Resolve color map from CSS token values at render time (no hardcoded hex)
  const estadoColors: Record<string, string> = Object.fromEntries(
    Object.entries(ESTADO_COLOR_KEYS).map(([estado, key]) => [estado, theme[key]]),
  )

  // Filter out states with 0 quantity (known bug fix)
  const chartData = data
    .filter((d) => d.cantidad > 0)
    .map((d) => ({
      name: ESTADO_LABELS[d.estado] ?? d.estado,
      value: d.cantidad,
      estado: d.estado,
    }))

  return (
    <Card variant="elevated" className="p-5">
      <h2 className="text-base font-semibold text-fg mb-4">Pedidos por estado</h2>

      {loading && <Skeleton height="h-[220px]" />}

      {!loading && chartData.length === 0 && (
        <EmptyState
          icon={PieChartIcon}
          title="Sin datos"
          description="No hay pedidos para el período seleccionado."
          className="py-8"
        />
      )}

      {!loading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.estado}
                  fill={estadoColors[entry.estado] ?? theme.axis}
                />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
