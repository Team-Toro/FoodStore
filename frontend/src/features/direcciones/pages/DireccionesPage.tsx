import { useState } from 'react'
import { useDirecciones } from '../hooks'
import { DireccionCard } from '../components/DireccionCard'
import { DireccionFormModal } from '../components/DireccionFormModal'
import type { DireccionRead } from '../types'

export function DireccionesPage(): JSX.Element {
  const { data: direcciones = [], isLoading, isError } = useDirecciones()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDireccion, setEditingDireccion] = useState<DireccionRead | null>(null)

  function handleAdd() {
    setEditingDireccion(null)
    setModalOpen(true)
  }

  function handleEdit(dir: DireccionRead) {
    setEditingDireccion(dir)
    setModalOpen(true)
  }

  function handleClose() {
    setModalOpen(false)
    setEditingDireccion(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Mis Direcciones</h1>
        <button
          onClick={handleAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Agregar dirección
        </button>
      </div>

      {isLoading && (
        <p className="text-gray-500 text-center py-8">Cargando...</p>
      )}

      {isError && (
        <p className="text-red-600 text-center py-8">
          No se pudieron cargar las direcciones.
        </p>
      )}

      {!isLoading && !isError && direcciones.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">No tenés direcciones guardadas todavía.</p>
          <button
            onClick={handleAdd}
            className="text-indigo-600 hover:underline text-sm font-medium"
          >
            Agregar tu primera dirección
          </button>
        </div>
      )}

      <div className="space-y-4">
        {direcciones.map((dir) => (
          <DireccionCard key={dir.id} direccion={dir} onEdit={handleEdit} />
        ))}
      </div>

      {modalOpen && (
        <DireccionFormModal
          direccion={editingDireccion}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
