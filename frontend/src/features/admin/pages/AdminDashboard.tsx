// redesigned in us-009 — Phase 6
import { useState } from 'react'
import { DollarSign, ShoppingCart, Users, Package } from 'lucide-react'
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
import { PageHeader } from '../../../shared/ui'
import { Input } from '../../../shared/ui'
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
      <PageHeader
        title="Dashboard"
        description="Resumen operativo del negocio."
        breadcrumb={[{ label: 'Admin' }, { label: 'Dashboard' }]}
        actions={
          /* Date range selector */
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-fg-muted">Desde:</label>
            <Input
              type="date"
              value={desde}
              max={hasta}
              onChange={(e) => setDesde(e.target.value)}
              className="w-36"
            />
            <label className="text-sm text-fg-muted">Hasta:</label>
            <Input
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => setHasta(e.target.value)}
              className="w-36"
            />
          </div>
        }
      />

      {/* KPI cards */}
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
          icon={DollarSign}
        />
        <KpiCard
          title="Pedidos"
          value={resumen?.pedidos_totales}
          loading={loadingResumen}
          icon={ShoppingCart}
        />
        <KpiCard
          title="Usuarios activos"
          value={resumen?.usuarios_activos}
          loading={loadingResumen}
          icon={Users}
        />
        <KpiCard
          title="Productos activos"
          value={resumen?.productos_activos}
          loading={loadingResumen}
          icon={Package}
        />
      </div>

      {/* Charts row */}
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
