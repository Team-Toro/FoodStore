import { useEffect, useState } from 'react'
import type { DireccionCreate, DireccionRead, DireccionUpdate } from '../types'
import { useCreateDireccion, useUpdateDireccion } from '../hooks'

interface DireccionFormModalProps {
  /** If provided, the form is in edit mode */
  direccion?: DireccionRead | null
  onClose: () => void
}

export function DireccionFormModal({ direccion, onClose }: DireccionFormModalProps): JSX.Element {
  const isEdit = direccion != null

  const [linea1, setLinea1] = useState(direccion?.linea1 ?? '')
  const [linea2, setLinea2] = useState(direccion?.linea2 ?? '')
  const [ciudad, setCiudad] = useState(direccion?.ciudad ?? '')
  const [codigoPostal, setCodigoPostal] = useState(direccion?.codigo_postal ?? '')
  const [referencia, setReferencia] = useState(direccion?.referencia ?? '')
  const [alias, setAlias] = useState(direccion?.alias ?? '')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useCreateDireccion()
  const updateMutation = useUpdateDireccion()

  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (direccion) {
      setLinea1(direccion.linea1)
      setLinea2(direccion.linea2 ?? '')
      setCiudad(direccion.ciudad)
      setCodigoPostal(direccion.codigo_postal ?? '')
      setReferencia(direccion.referencia ?? '')
      setAlias(direccion.alias ?? '')
    }
  }, [direccion])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!linea1.trim()) {
      setError('La dirección (línea 1) es requerida')
      return
    }
    if (!ciudad.trim()) {
      setError('La ciudad es requerida')
      return
    }

    try {
      if (isEdit && direccion) {
        const data: DireccionUpdate = {
          linea1: linea1 || undefined,
          linea2: linea2 || null,
          ciudad: ciudad || undefined,
          codigo_postal: codigoPostal || null,
          referencia: referencia || null,
          alias: alias || null,
        }
        await updateMutation.mutateAsync({ id: direccion.id, data })
      } else {
        const data: DireccionCreate = {
          linea1,
          linea2: linea2 || null,
          ciudad,
          codigo_postal: codigoPostal || null,
          referencia: referencia || null,
          alias: alias || null,
        }
        await createMutation.mutateAsync(data)
      }
      onClose()
    } catch {
      setError('Ocurrió un error. Por favor, intentá de nuevo.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Editar dirección' : 'Agregar dirección'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={linea1}
              onChange={(e) => setLinea1(e.target.value)}
              placeholder="Av. Corrientes 1234"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Piso / Departamento
            </label>
            <input
              type="text"
              value={linea2}
              onChange={(e) => setLinea2(e.target.value)}
              placeholder="Piso 3, Dpto B"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ciudad <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              placeholder="Buenos Aires"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código Postal
            </label>
            <input
              type="text"
              value={codigoPostal}
              onChange={(e) => setCodigoPostal(e.target.value)}
              placeholder="C1414"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Entre calles..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alias
            </label>
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Casa, Trabajo..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
