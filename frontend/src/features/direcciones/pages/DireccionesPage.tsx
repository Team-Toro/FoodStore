import { useState } from 'react'
import { MapPin, Plus } from 'lucide-react'
import { useDirecciones } from '../hooks'
import { DireccionCard } from '../components/DireccionCard'
import { DireccionFormModal } from '../components/DireccionFormModal'
import type { DireccionRead } from '../types'
import { Button } from '../../../shared/ui/Button'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { Skeleton } from '../../../shared/ui/Skeleton'

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
        <h1 className="text-2xl font-semibold text-fg">Mis Direcciones</h1>
        <Button
          variant="primary"
          size="sm"
          onClick={handleAdd}
          aria-label="Agregar nueva dirección"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar dirección
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-danger-fg text-center py-8">
          No se pudieron cargar las direcciones.
        </p>
      )}

      {!isLoading && !isError && direcciones.length === 0 && (
        <EmptyState
          icon={MapPin}
          title="Sin direcciones guardadas"
          description="No tenés direcciones guardadas todavía."
          action={
            <Button variant="secondary" size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar tu primera dirección
            </Button>
          }
        />
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
