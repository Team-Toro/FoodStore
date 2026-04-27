import type { HistorialRead } from '../../../types/pedido'
import { ESTADO_LABELS } from '../../../types/pedido'

interface HistorialTimelineProps {
  historial: HistorialRead[]
}

const ESTADO_ICONS: Record<string, string> = {
  PENDIENTE: '🕐',
  CONFIRMADO: '✅',
  EN_PREP: '👨‍🍳',
  EN_CAMINO: '🚚',
  ENTREGADO: '📦',
  CANCELADO: '❌',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistorialTimeline({ historial }: HistorialTimelineProps): JSX.Element {
  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {historial.map((entry, idx) => (
          <li key={entry.id}>
            <div className="relative pb-8">
              {idx < historial.length - 1 && (
                <span
                  className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white text-sm">
                  {ESTADO_ICONS[entry.estado_hasta] ?? '•'}
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {entry.estado_desde === null
                        ? `Pedido creado — ${ESTADO_LABELS[entry.estado_hasta as keyof typeof ESTADO_LABELS] ?? entry.estado_hasta}`
                        : `${ESTADO_LABELS[entry.estado_desde as keyof typeof ESTADO_LABELS] ?? entry.estado_desde} → ${ESTADO_LABELS[entry.estado_hasta as keyof typeof ESTADO_LABELS] ?? entry.estado_hasta}`}
                    </p>
                    {entry.observacion && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        Motivo: {entry.observacion}
                      </p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-gray-500">
                    {formatDate(entry.creado_en)}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
