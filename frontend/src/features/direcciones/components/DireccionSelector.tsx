import { useEffect } from 'react'
import { useDirecciones } from '../hooks'
import { usePaymentStore } from '../../../app/store/paymentStore'
import type { DireccionRead } from '../types'

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
    return <p className="text-sm text-gray-500">Cargando direcciones...</p>
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Dirección de entrega</p>

      {direcciones.map((dir: DireccionRead) => (
        <label
          key={dir.id}
          className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
            direccionSeleccionadaId === dir.id
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="direccion"
            value={dir.id}
            checked={direccionSeleccionadaId === dir.id}
            onChange={() => handleSelect(dir.id)}
            className="mt-0.5 accent-indigo-600"
          />
          <div className="text-sm">
            {dir.alias && (
              <p className="font-semibold text-gray-900">{dir.alias}</p>
            )}
            <p className="text-gray-700">{dir.linea1}</p>
            {dir.linea2 && <p className="text-gray-500">{dir.linea2}</p>}
            <p className="text-gray-700">
              {dir.ciudad}
              {dir.codigo_postal ? ` (${dir.codigo_postal})` : ''}
            </p>
            {dir.es_principal && (
              <span className="inline-block mt-1 text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                Principal
              </span>
            )}
          </div>
        </label>
      ))}

      {/* Retiro en local */}
      <label
        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
          direccionSeleccionadaId === null
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input
          type="radio"
          name="direccion"
          value=""
          checked={direccionSeleccionadaId === null}
          onChange={() => handleSelect(null)}
          className="mt-0.5 accent-indigo-600"
        />
        <div className="text-sm">
          <p className="font-semibold text-gray-900">Sin dirección (retiro en local)</p>
          <p className="text-gray-500">Retirás el pedido en nuestro local</p>
        </div>
      </label>
    </div>
  )
}
