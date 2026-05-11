import { useEffect } from 'react'
import { useDirecciones } from '../hooks'
import { usePaymentStore } from '../../../app/store/paymentStore'
import type { DireccionRead } from '../types'
import { Badge } from '../../../shared/ui/Badge'
import { Spinner } from '../../../shared/ui/Spinner'
import { cn } from '../../../shared/lib/cn'

interface DireccionSelectorProps {
  /** Called when the selected address changes (includes null for "retiro en local") */
  onChange?: (direccionId: number | null) => void
}

export function DireccionSelector({ onChange }: DireccionSelectorProps): JSX.Element {
  const { data: direcciones = [], isLoading } = useDirecciones()
  const direccionSeleccionadaId = usePaymentStore((s) => s.direccionSeleccionadaId)
  const setDireccionSeleccionada = usePaymentStore((s) => s.setDireccionSeleccionada)

  // Pre-select the principal address on first load
  useEffect(() => {
    if (direcciones.length > 0 && direccionSeleccionadaId === undefined) {
      const principal = direcciones.find((d) => d.es_principal)
      const selected = principal ?? direcciones[0]
      setDireccionSeleccionada(selected.id)
      onChange?.(selected.id)
    }
  }, [direcciones]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(id: number | null) {
    setDireccionSeleccionada(id)
    onChange?.(id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-fg-muted">
        <Spinner size="xs" />
        Cargando direcciones...
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-fg">Dirección de entrega</p>

      {direcciones.map((dir: DireccionRead) => (
        <label
          key={dir.id}
          className={cn(
            'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
            direccionSeleccionadaId === dir.id
              ? 'border-brand-400 bg-brand-50'
              : 'border-border hover:border-border-strong',
          )}
        >
          <input
            type="radio"
            name="direccion"
            value={dir.id}
            checked={direccionSeleccionadaId === dir.id}
            onChange={() => handleSelect(dir.id)}
            className="mt-0.5 accent-brand-600"
          />
          <div className="text-sm">
            {dir.alias && (
              <p className="font-semibold text-fg">{dir.alias}</p>
            )}
            <p className="text-fg-muted">{dir.linea1}</p>
            {dir.linea2 && <p className="text-fg-muted">{dir.linea2}</p>}
            <p className="text-fg-muted">
              {dir.ciudad}
              {dir.codigo_postal ? ` (${dir.codigo_postal})` : ''}
            </p>
            {dir.es_principal && (
              <div className="mt-1">
                <Badge variant="brand">Principal</Badge>
              </div>
            )}
          </div>
        </label>
      ))}

      {/* Retiro en local */}
      <label
        className={cn(
          'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
          direccionSeleccionadaId === null
            ? 'border-brand-400 bg-brand-50'
            : 'border-border hover:border-border-strong',
        )}
      >
        <input
          type="radio"
          name="direccion"
          value=""
          checked={direccionSeleccionadaId === null}
          onChange={() => handleSelect(null)}
          className="mt-0.5 accent-brand-600"
        />
        <div className="text-sm">
          <p className="font-semibold text-fg">Sin dirección (retiro en local)</p>
          <p className="text-fg-muted">Retirás el pedido en nuestro local</p>
        </div>
      </label>
    </div>
  )
}
