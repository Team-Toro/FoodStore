import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TopProducto } from '../../../api/admin'

interface TopProductosBarChartProps {
  data: TopProducto[]
  loading?: boolean
}

export function TopProductosBarChart({
  data,
  loading = false,
}: TopProductosBarChartProps): JSX.Element {
  // Take at most 10, sort descending by cantidad_vendida
  const chartData = [...data]
    .sort((a, b) => b.cantidad_vendida - a.cantidad_vendida)
    .slice(0, 10)
    .map((d) => ({
      nombre:
        d.nombre.length > 20 ? `${d.nombre.slice(0, 18)}…` : d.nombre,
      cantidad: d.cantidad_vendida,
    }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Top 10 productos por unidades vendidas
      </h2>

      {loading && (
        <div className="animate-pulse h-48 bg-gray-100 rounded" />
      )}

      {!loading && chartData.length === 0 && (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Sin datos para el período seleccionado
        </div>
      )}

      {!loading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={chartData.length * 36 + 40}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis
              type="category"
              dataKey="nombre"
              width={140}
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <Tooltip formatter={(value: number) => [value, 'Unidades vendidas']} />
            <Bar dataKey="cantidad" fill="#4f46e5" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
