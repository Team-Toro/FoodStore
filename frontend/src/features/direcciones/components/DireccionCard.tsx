import type { DireccionRead } from '../types'
import { useDeleteDireccion, useSetPredeterminada } from '../hooks'

interface DireccionCardProps {
  direccion: DireccionRead
  onEdit: (direccion: DireccionRead) => void
}

export function DireccionCard({ direccion, onEdit }: DireccionCardProps): JSX.Element {
  const deleteMutation = useDeleteDireccion()
  const setPrincipalMutation = useSetPredeterminada()

  return (
    <div className={`border rounded-xl p-4 bg-white shadow-sm ${direccion.es_principal ? 'border-indigo-400' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          {direccion.es_principal && (
            <span className="inline-block mb-2 text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              Principal
            </span>
          )}
          {direccion.alias && (
            <p className="font-semibold text-gray-900">{direccion.alias}</p>
          )}
          <p className="text-sm text-gray-700">{direccion.linea1}</p>
          {direccion.linea2 && (
            <p className="text-sm text-gray-500">{direccion.linea2}</p>
          )}
          <p className="text-sm text-gray-700">
            {direccion.ciudad}
            {direccion.codigo_postal ? ` (${direccion.codigo_postal})` : ''}
          </p>
          {direccion.referencia && (
            <p className="text-xs text-gray-400 mt-1">Ref: {direccion.referencia}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4 flex-wrap">
        <button
          onClick={() => onEdit(direccion)}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Editar
        </button>
        {!direccion.es_principal && (
          <button
            onClick={() => setPrincipalMutation.mutate(direccion.id)}
            disabled={setPrincipalMutation.isPending}
            className="text-sm px-3 py-1.5 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            {setPrincipalMutation.isPending ? 'Guardando...' : 'Marcar como principal'}
          </button>
        )}
        <button
          onClick={() => {
            if (window.confirm('¿Eliminar esta dirección?')) {
              deleteMutation.mutate(direccion.id)
            }
          }}
          disabled={deleteMutation.isPending}
          className="text-sm px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>

      {deleteMutation.isError && (
        <p className="text-xs text-red-600 mt-2">
          No se pudo eliminar. La dirección puede tener pedidos activos.
        </p>
      )}
    </div>
  )
}
