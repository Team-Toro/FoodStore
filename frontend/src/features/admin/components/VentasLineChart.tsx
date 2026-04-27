import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
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
  // raw comes as ISO date-like string from DATE_TRUNC
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

export function VentasLineChart({
  data,
  params,
  onParamsChange,
  loading = false,
}: VentasLineChartProps): JSX.Element {
  const granularidad = params.granularidad ?? 'day'
  const chartData = data.map((d) => ({
    ...d,
    label: formatPeriodo(d.periodo, granularidad),
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Ventas por período</h2>
        <div className="flex gap-1">
          {GRANULARIDADES.map((g) => (
            <button
              key={g.value}
              onClick={() => onParamsChange({ ...params, granularidad: g.value })}
              className={`px-3 py-1 rounded text-xs font-medium border transition ${
                granularidad === g.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

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
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${v.toLocaleString('es-AR')}`}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString('es-AR')}`, 'Total']}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
