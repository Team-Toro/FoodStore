import { useState } from 'react'
import { FolderOpen, Pencil, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAdminCategorias,
  useCreateCategoria,
  useUpdateCategoria,
  useDeleteCategoria,
} from '../hooks/useAdminCategorias'
import { computeForbiddenParents } from '../lib/computeForbiddenParents'
import type { CategoriaAdminRead } from '../../../api/admin'
import {
  Button,
  Input,
  Select,
  Badge,
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
// CategoriaFormDialog — create / edit
// ---------------------------------------------------------------------------

interface CategoriaFormDialogProps {
  editTarget: CategoriaAdminRead | null // null = create
  allCategorias: CategoriaAdminRead[]
  onClose: () => void
}

function CategoriaFormDialog({
  editTarget,
  allCategorias,
  onClose,
}: CategoriaFormDialogProps): JSX.Element {
  const isEdit = editTarget !== null
  const [nombre, setNombre] = useState(editTarget?.nombre ?? '')
  const [padreId, setPadreId] = useState<string>(
    editTarget?.padre_id !== null && editTarget?.padre_id !== undefined
      ? String(editTarget.padre_id)
      : '',
  )
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const createMutation = useCreateCategoria()
  const updateMutation = useUpdateCategoria()
  const isPending = createMutation.isPending || updateMutation.isPending

  // Categories that cannot be used as parent (self + descendants)
  const forbidden = computeForbiddenParents(editTarget?.id ?? null, allCategorias)
  const allowedParents = allCategorias.filter((c) => !forbidden.has(c.id))

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
      padre_id: padreId ? Number(padreId) : null,
    }

    if (isEdit) {
      updateMutation.mutate(
        { id: editTarget.id, body },
        {
          onSuccess: () => {
            toast.success('Categoría actualizada')
            onClose()
          },
          onError: (err: unknown) => {
            const msg =
              (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
              'Error al actualizar la categoría'
            setApiError(msg)
          },
        },
      )
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success('Categoría creada')
          onClose()
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            'Error al crear la categoría'
          setApiError(msg)
        },
      })
    }
  }

  return (
    <Dialog open onClose={onClose} aria-labelledby="cat-form-title">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle id="cat-form-title">
            {isEdit ? 'Editar categoría' : 'Nueva categoría'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modificá el nombre o categoría padre y guardá los cambios.'
              : 'Completá los datos para crear una nueva categoría.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-fg mb-1" htmlFor="cat-nombre">
              Nombre *
            </label>
            <Input
              id="cat-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Pizzas"
              autoFocus
            />
            {fieldError && (
              <p className="mt-1 text-xs text-danger-fg">{fieldError}</p>
            )}
          </div>

          {/* Categoría padre */}
          <div>
            <label className="block text-sm font-medium text-fg mb-1" htmlFor="cat-padre">
              Categoría padre (opcional)
            </label>
            <Select
              id="cat-padre"
              value={padreId}
              onChange={(e) => setPadreId(e.target.value)}
            >
              <option value="">— Sin padre (categoría raíz) —</option>
              {allowedParents.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.padre_id !== null ? `└ ${cat.nombre}` : cat.nombre}
                </option>
              ))}
            </Select>
          </div>

          {apiError && (
            <p className="text-sm text-danger-fg font-medium">{apiError}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={isPending} loading={isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear categoría'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// DeleteCategoriaDialog
// ---------------------------------------------------------------------------

interface DeleteCategoriaDialogProps {
  categoria: CategoriaAdminRead
  onClose: () => void
}

function DeleteCategoriaDialog({ categoria, onClose }: DeleteCategoriaDialogProps): JSX.Element {
  const [apiError, setApiError] = useState<string | null>(null)
  const deleteMutation = useDeleteCategoria()

  function handleDelete() {
    setApiError(null)
    deleteMutation.mutate(categoria.id, {
      onSuccess: () => {
        toast.success('Categoría eliminada')
        onClose()
      },
      onError: (err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          'Error al eliminar la categoría'
        if (status === 409) {
          // 409 Conflict — backend rejected because it has children or products
          setApiError(msg)
        } else {
          toast.error(msg)
          onClose()
        }
      },
    })
  }

  return (
    <Dialog open onClose={onClose} aria-labelledby="delete-cat-title">
      <DialogHeader>
        <DialogTitle id="delete-cat-title">Eliminar categoría</DialogTitle>
        <DialogDescription>
          ¿Estás seguro de que querés eliminar <strong>{categoria.nombre}</strong>? Esta acción
          no se puede deshacer.
        </DialogDescription>
      </DialogHeader>

      {apiError && (
        <div className="mt-2 rounded-md bg-danger-bg px-4 py-3">
          <p className="text-sm text-danger-fg">{apiError}</p>
        </div>
      )}

      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={deleteMutation.isPending}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
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
// AdminCategorias
// ---------------------------------------------------------------------------

export function AdminCategorias(): JSX.Element {
  const [nombre, setNombre] = useState('')
  const [padreFilter, setPadreFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const size = 20

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CategoriaAdminRead | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CategoriaAdminRead | null>(null)

  // Fetch all categories (unfiltered) for parent dropdown options
  const { data: allData } = useAdminCategorias({ size: 500 })
  const allCategorias = allData?.items ?? []

  // Fetch with active filters
  const params = {
    nombre: nombre || undefined,
    padre_id: padreFilter === '__root__' ? null : padreFilter ? Number(padreFilter) : undefined,
    page,
    size,
  }
  const { data, isLoading, isError } = useAdminCategorias(params)

  // Top-level (root) categories for parent filter dropdown
  const rootCategorias = allCategorias.filter((c) => c.padre_id === null)

  function openCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  function openEdit(cat: CategoriaAdminRead) {
    setEditTarget(cat)
    setFormOpen(true)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditTarget(null)
  }

  const columns = [
    {
      header: 'Nombre',
      render: (cat: CategoriaAdminRead) => (
        <span className="font-medium text-fg">
          {cat.padre_id !== null ? (
            <>
              <span className="text-fg-muted mr-1">└</span>
              {cat.nombre}
            </>
          ) : (
            cat.nombre
          )}
        </span>
      ),
    },
    {
      header: 'Padre',
      render: (cat: CategoriaAdminRead) => {
        if (cat.padre_id === null) {
          return <Badge variant="neutral">Raíz</Badge>
        }
        const parent = allCategorias.find((c) => c.id === cat.padre_id)
        return (
          <span className="text-fg-muted text-xs">{parent?.nombre ?? `#${cat.padre_id}`}</span>
        )
      },
    },
    {
      header: 'Estado',
      render: (_cat: CategoriaAdminRead) => (
        <Badge variant="success">Activa</Badge>
      ),
    },
    {
      header: 'Creada',
      render: (cat: CategoriaAdminRead) =>
        new Date(cat.creado_en).toLocaleDateString('es-AR'),
      cellClassName: 'text-fg-muted text-xs',
    },
    {
      header: 'Acciones',
      align: 'right' as const,
      render: (cat: CategoriaAdminRead) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(cat)}
            aria-label="Editar categoría"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(cat)}
            className="text-danger-fg hover:bg-danger-bg"
            aria-label="Eliminar categoría"
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
        title="Categorías"
        description="Gestioná las categorías del catálogo."
        breadcrumb={[{ label: 'Admin' }, { label: 'Categorías' }]}
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva categoría
          </Button>
        }
      />

      <Toolbar
        filters={
          <>
            <Input
              type="text"
              placeholder="Buscar por nombre..."
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                setPage(1)
              }}
              className="w-56"
            />
            <Select
              value={padreFilter}
              onChange={(e) => {
                setPadreFilter(e.target.value)
                setPage(1)
              }}
              className="w-48"
            >
              <option value="">Todas las categorías</option>
              <option value="__root__">Solo raíz</option>
              {rootCategorias.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  Hijas de: {cat.nombre}
                </option>
              ))}
            </Select>
          </>
        }
      />

      {isError && (
        <p className="text-danger-fg text-center py-8">Error al cargar las categorías.</p>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(c) => c.id}
        loading={isLoading}
        emptyIcon={FolderOpen}
        emptyTitle="Sin categorías"
        emptyDescription="No hay categorías que coincidan con el filtro."
        emptyAction={
          <Button variant="primary" size="sm" onClick={openCreate}>
            Crear categoría
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
        <CategoriaFormDialog
          editTarget={editTarget}
          allCategorias={allCategorias}
          onClose={handleFormClose}
        />
      )}

      {deleteTarget !== null && (
        <DeleteCategoriaDialog
          categoria={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
