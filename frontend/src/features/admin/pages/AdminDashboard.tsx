import { useState } from 'react'
import { KpiCard } from '../components/KpiCard'
import { VentasLineChart } from '../components/VentasLineChart'
import { PedidosPieChart } from '../components/PedidosPieChart'
import { TopProductosBarChart } from '../components/TopProductosBarChart'
import {
  useResumen,
  useVentas,
  useTopProductos,
  usePedidosPorEstado,
} from '../hooks/useAdminMetricas'
import type { VentasParams } from '../../../api/admin'

// ---------------------------------------------------------------------------
// Date range helpers
// ---------------------------------------------------------------------------
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function defaultDesde(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return isoDate(d)
}

function defaultHasta(): string {
  return isoDate(new Date())
}

// ---------------------------------------------------------------------------
// AdminDashboard
// ---------------------------------------------------------------------------
export function AdminDashboard(): JSX.Element {
  const [desde, setDesde] = useState<string>(defaultDesde)
  const [hasta, setHasta] = useState<string>(defaultHasta)
  const [ventasParams, setVentasParams] = useState<VentasParams>({
    granularidad: 'day',
  })

  const rangeParams = { desde, hasta }
  const ventasFullParams = { ...rangeParams, ...ventasParams }

  const { data: resumen, isLoading: loadingResumen } = useResumen(rangeParams)
  const { data: ventas = [], isLoading: loadingVentas } = useVentas(ventasFullParams)
  const { data: topProductos = [], isLoading: loadingTop } = useTopProductos(rangeParams)
  const { data: pedidosEstado = [], isLoading: loadingPedidosEstado } =
    usePedidosPorEstado(rangeParams)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>

        {/* Date range selector — task 10.3 */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-gray-600">Desde:</label>
          <input
            type="date"
            value={desde}
            max={hasta}
            onChange={(e) => setDesde(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
          />
          <label className="text-sm text-gray-600">Hasta:</label>
          <input
            type="date"
            value={hasta}
            min={desde}
            onChange={(e) => setHasta(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* KPI cards — task 10.1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Ventas totales"
          value={
            resumen
              ? `$${resumen.ventas_totales.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : null
          }
          loading={loadingResumen}
        />
        <KpiCard
          title="Pedidos"
          value={resumen?.pedidos_totales}
          loading={loadingResumen}
        />
        <KpiCard
          title="Usuarios activos"
          value={resumen?.usuarios_activos}
          loading={loadingResumen}
        />
        <KpiCard
          title="Productos activos"
          value={resumen?.productos_activos}
          loading={loadingResumen}
        />
      </div>

      {/* Charts — task 10.2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <VentasLineChart
          data={ventas}
          params={ventasFullParams}
          onParamsChange={(p) => setVentasParams(p)}
          loading={loadingVentas}
        />
        <PedidosPieChart data={pedidosEstado} loading={loadingPedidosEstado} />
      </div>

      <TopProductosBarChart data={topProductos} loading={loadingTop} />
    </div>
  )
}
