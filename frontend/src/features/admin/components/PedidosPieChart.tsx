import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { PedidosPorEstado } from '../../../api/admin'

interface PedidosPieChartProps {
  data: PedidosPorEstado[]
  loading?: boolean
}

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: '#f59e0b',
  CONFIRMADO: '#3b82f6',
  EN_PREP: '#8b5cf6',
  EN_CAMINO: '#06b6d4',
  ENTREGADO: '#22c55e',
  CANCELADO: '#ef4444',
}

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  EN_PREP: 'En prep.',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

export function PedidosPieChart({ data, loading = false }: PedidosPieChartProps): JSX.Element {
  const chartData = data
    .filter((d) => d.cantidad > 0)
    .map((d) => ({
      name: ESTADO_LABELS[d.estado] ?? d.estado,
      value: d.cantidad,
      estado: d.estado,
    }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Pedidos por estado</h2>

      {loading && (
        <div className="animate-pulse h-48 bg-gray-100 rounded" />
      )}

      {!loading && chartData.length === 0 && (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Sin datos para el período seleccionado
        </div>
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
                  fill={ESTADO_COLORS[entry.estado] ?? '#94a3b8'}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [value, 'Pedidos']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
