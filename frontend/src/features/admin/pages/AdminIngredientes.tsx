import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FlaskConical, Pencil, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  listIngredientes,
  createIngrediente,
  updateIngrediente,
  deleteIngrediente,
  type IngredienteAdminRead,
} from '../../../api/admin'
import {
  Button,
  Badge,
  Input,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  PageHeader,
  Toolbar,
  DataTable,
  PaginationBar,
} from '../../../shared/ui'

// ---------------------------------------------------------------------------
// IngredienteFormDialog — create / edit
// ---------------------------------------------------------------------------

interface IngredienteFormDialogProps {
  editTarget: IngredienteAdminRead | null // null = create
  onClose: () => void
}

function IngredienteFormDialog({ editTarget, onClose }: IngredienteFormDialogProps): JSX.Element {
  const isEdit = editTarget !== null
  const queryClient = useQueryClient()

  const [nombre, setNombre] = useState(editTarget?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(editTarget?.descripcion ?? '')
  const [esAlergeno, setEsAlergeno] = useState(editTarget?.es_alergeno ?? false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: createIngrediente,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ingredientes'] })
      // Also invalidate catalogo ingredientes used in product forms
      void queryClient.invalidateQueries({ queryKey: ['catalogo', 'ingredientes'] })
      toast.success('Ingrediente creado')
      onClose()
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Error al crear el ingrediente'
      if (status === 409) {
        // Keep dialog open — show inline error (INGREDIENTE_DUPLICADO)
        setApiError(detail)
      } else {
        toast.error(detail)
        onClose()
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { nombre?: string; descripcion?: string | null; es_alergeno?: boolean } }) =>
      updateIngrediente(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ingredientes'] })
      void queryClient.invalidateQueries({ queryKey: ['catalogo', 'ingredientes'] })
      toast.success('Ingrediente actualizado')
      onClose()
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Error al actualizar el ingrediente'
      if (status === 409) {
        setApiError(detail)
      } else {
        toast.error(detail)
        onClose()
      }
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)
    setApiError(null)

    if (!nombre.trim()) {
      setFieldError('El nombre es requerido')
      return
    }

    const body = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      es_alergeno: esAlergeno,
    }

    if (isEdit) {
      updateMutation.mutate({ id: editTarget.id, body })
    } else {
      createMutation.mutate(body)
    }
  }

  return (
    <Dialog open onClose={onClose} aria-labelledby="ing-form-title">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle id="ing-form-title">
            {isEdit ? 'Editar ingrediente' : 'Nuevo ingrediente'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modificá los datos del ingrediente y guardá los cambios.'
              : 'Completá los datos para registrar un nuevo ingrediente.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-fg mb-1" htmlFor="ing-nombre">
              Nombre *
            </label>
            <Input
              id="ing-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Tomate, Mozzarella..."
              autoFocus
            />
            {fieldError && (
              <p className="mt-1 text-xs text-danger-fg">{fieldError}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-fg mb-1" htmlFor="ing-descripcion">
              Descripción (opcional)
            </label>
            <Input
              id="ing-descripcion"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción corta..."
            />
          </div>

          {/* Es alérgeno */}
          <div className="flex items-center gap-2">
            <input
              id="ing-alergeno"
              type="checkbox"
              checked={esAlergeno}
              onChange={(e) => setEsAlergeno(e.target.checked)}
              className="rounded border-border text-brand-500 focus:ring-ring"
            />
            <label htmlFor="ing-alergeno" className="text-sm text-fg">
              Es alérgeno
            </label>
          </div>

          {/* API error — inline, keeps dialog open */}
          {apiError && (
            <div className="rounded-md bg-danger-bg px-4 py-3">
              <p className="text-sm text-danger-fg">{apiError}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={isPending} loading={isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear ingrediente'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// DeleteIngredienteDialog
// ---------------------------------------------------------------------------

interface DeleteIngredienteDialogProps {
  ingrediente: IngredienteAdminRead
  onClose: () => void
}

function DeleteIngredienteDialog({ ingrediente, onClose }: DeleteIngredienteDialogProps): JSX.Element {
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: () => deleteIngrediente(ingrediente.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ingredientes'] })
      void queryClient.invalidateQueries({ queryKey: ['catalogo', 'ingredientes'] })
      toast.success('Ingrediente eliminado')
      onClose()
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Error al eliminar el ingrediente'
      toast.error(detail)
      onClose()
    },
  })

  return (
    <Dialog open onClose={onClose} aria-labelledby="delete-ing-title">
      <DialogHeader>
        <DialogTitle id="delete-ing-title">Eliminar ingrediente</DialogTitle>
        <DialogDescription>
          ¿Estás seguro de que querés eliminar <strong>{ingrediente.nombre}</strong>? Esta acción
          no se puede deshacer.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={deleteMutation.isPending}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          loading={deleteMutation.isPending}
        >
          Sí, eliminar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// AdminIngredientes page
// ---------------------------------------------------------------------------

export function AdminIngredientes(): JSX.Element {
  const [page, setPage] = useState(1)
  const size = 20

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<IngredienteAdminRead | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<IngredienteAdminRead | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'ingredientes', { page, size }],
    queryFn: () => listIngredientes({ page, size }),
    staleTime: 1000 * 30,
  })

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(ing: IngredienteAdminRead) {
    setEditTarget(ing)
    setFormOpen(true)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditTarget(null)
  }

  const columns = [
    {
      header: 'Nombre',
      render: (ing: IngredienteAdminRead) => (
        <span className="font-medium text-fg">{ing.nombre}</span>
      ),
    },
    {
      header: 'Es alérgeno',
      render: (ing: IngredienteAdminRead) =>
        ing.es_alergeno ? (
          <Badge variant="warning">Sí</Badge>
        ) : (
          <Badge variant="neutral">No</Badge>
        ),
    },
    {
      header: 'Descripción',
      render: (ing: IngredienteAdminRead) =>
        ing.descripcion ? (
          <span className="text-xs text-fg-muted truncate max-w-xs">{ing.descripcion}</span>
        ) : (
          <span className="text-xs text-fg-subtle">—</span>
        ),
    },
    {
      header: 'Acciones',
      align: 'right' as const,
      render: (ing: IngredienteAdminRead) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(ing)}
            aria-label="Editar ingrediente"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(ing)}
            className="text-danger-fg hover:bg-danger-bg"
            aria-label="Eliminar ingrediente"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title="Ingredientes"
        description="Gestioná los ingredientes del catálogo."
        breadcrumb={[{ label: 'Admin' }, { label: 'Ingredientes' }]}
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo ingrediente
          </Button>
        }
      />

      <Toolbar />

      {isError && (
        <p className="text-danger-fg text-center py-8">Error al cargar los ingredientes.</p>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(ing) => ing.id}
        loading={isLoading}
        emptyIcon={FlaskConical}
        emptyTitle="Sin ingredientes"
        emptyDescription="No hay ingredientes registrados aún."
        emptyAction={
          <Button variant="primary" size="sm" onClick={openCreate}>
            Crear ingrediente
          </Button>
        }
      />

      {data && (
        <PaginationBar
          page={page}
          pages={data.pages}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      {formOpen && (
        <IngredienteFormDialog
          editTarget={editTarget}
          onClose={handleFormClose}
        />
      )}

      {deleteTarget !== null && (
        <DeleteIngredienteDialog
          ingrediente={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
