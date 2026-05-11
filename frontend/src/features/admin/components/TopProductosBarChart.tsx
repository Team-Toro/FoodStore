// redesigned in us-009 — Phase 6
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { Card } from '../../../shared/ui/Card'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { ShoppingBag } from 'lucide-react'
import { useChartTheme } from '../hooks/useChartTheme'
import type { TopProducto } from '../../../api/admin'

interface TopProductosBarChartProps {
  data: TopProducto[]
  loading?: boolean
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------
function BarTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <Card variant="elevated" className="p-3 text-sm shadow-lg">
      <p className="text-fg-muted mb-0.5">{label}</p>
      <p className="font-semibold text-fg">{payload[0]?.value} unidades</p>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// TopProductosBarChart
// ---------------------------------------------------------------------------
export function TopProductosBarChart({
  data,
  loading = false,
}: TopProductosBarChartProps): JSX.Element {
  const theme = useChartTheme()

  const chartData = [...data]
    .sort((a, b) => b.cantidad_vendida - a.cantidad_vendida)
    .slice(0, 10)
    .map((d) => ({
      nombre:
        d.nombre.length > 20 ? `${d.nombre.slice(0, 18)}…` : d.nombre,
      cantidad: d.cantidad_vendida,
    }))

  return (
    <Card variant="elevated" className="p-5">
      <h2 className="text-base font-semibold text-fg mb-4">
        Top 10 productos por unidades vendidas
      </h2>

      {loading && <Skeleton height="h-[260px]" />}

      {!loading && chartData.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title="Sin datos"
          description="No hay productos vendidos para el período seleccionado."
          className="py-8"
        />
      )}

      {!loading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={chartData.length * 36 + 40}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.grid} />
            <XAxis
              type="number"
              tick={{ fill: theme.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="nombre"
              width={140}
              tick={{ fill: theme.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<BarTooltip />} />
            <Bar
              dataKey="cantidad"
              fill={theme.accent}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
