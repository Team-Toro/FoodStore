import { useEffect, useState } from 'react'
import { MapPin, Eye, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAdminDirecciones,
  useSoftDeleteDireccion,
} from '../hooks/useAdminDirecciones'
import type { DireccionAdminRead } from '../../../api/admin'
import {
  Button,
  Input,
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
// useDebounce helper
// ---------------------------------------------------------------------------
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

// ---------------------------------------------------------------------------
// DireccionDetailDialog — read-only view
// ---------------------------------------------------------------------------

interface DireccionDetailDialogProps {
  direccion: DireccionAdminRead
  onClose: () => void
}

function DireccionDetailDialog({ direccion, onClose }: DireccionDetailDialogProps): JSX.Element {
  return (
    <Dialog open onClose={onClose} aria-labelledby="dir-detail-title">
      <DialogHeader>
        <DialogTitle id="dir-detail-title">Detalle de dirección</DialogTitle>
        <DialogDescription>
          Información completa de la dirección #{direccion.id}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-2 text-sm">
        {[
          { label: 'ID', value: String(direccion.id) },
          { label: 'Usuario ID', value: String(direccion.usuario_id) },
          {
            label: 'Email usuario',
            value: direccion.usuario_email ?? '—',
          },
          {
            label: 'Nombre usuario',
            value: direccion.usuario_nombre ?? '—',
          },
          { label: 'Alias / Etiqueta', value: direccion.alias ?? '—' },
          { label: 'Línea 1', value: direccion.linea1 },
          { label: 'Línea 2', value: direccion.linea2 ?? '—' },
          { label: 'Ciudad', value: direccion.ciudad },
          { label: 'Código postal', value: direccion.codigo_postal ?? '—' },
          { label: 'Referencia', value: direccion.referencia ?? '—' },
          {
            label: 'Es principal',
            value: direccion.es_principal ? 'Sí' : 'No',
          },
          {
            label: 'Creada',
            value: new Date(direccion.creado_en).toLocaleString('es-AR'),
          },
          {
            label: 'Actualizada',
            value: new Date(direccion.actualizado_en).toLocaleString('es-AR'),
          },
          {
            label: 'Eliminada',
            value: direccion.deleted_at
              ? new Date(direccion.deleted_at).toLocaleString('es-AR')
              : '—',
          },
        ].map(({ label, value }) => (
          <div key={label} className="flex gap-2">
            <span className="text-fg-muted w-36 shrink-0 font-medium">{label}:</span>
            <span className="text-fg break-all">{value}</span>
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// DeleteDireccionDialog
// ---------------------------------------------------------------------------

interface DeleteDireccionDialogProps {
  direccion: DireccionAdminRead
  onClose: () => void
}

function DeleteDireccionDialog({ direccion, onClose }: DeleteDireccionDialogProps): JSX.Element {
  const deleteMutation = useSoftDeleteDireccion()

  function handleDelete() {
    deleteMutation.mutate(direccion.id, {
      onSuccess: () => {
        toast.success('Dirección eliminada')
        onClose()
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          'Error al eliminar la dirección'
        toast.error(msg)
        onClose()
      },
    })
  }

  return (
    <Dialog open onClose={onClose} aria-labelledby="delete-dir-title">
      <DialogHeader>
        <DialogTitle id="delete-dir-title">Eliminar dirección</DialogTitle>
        <DialogDescription>
          ¿Estás seguro de que querés eliminar la dirección{' '}
          <strong>{direccion.linea1}, {direccion.ciudad}</strong>? Esta acción realizará un
          soft-delete.
        </DialogDescription>
      </DialogHeader>
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
// AdminDirecciones
// ---------------------------------------------------------------------------

export function AdminDirecciones(): JSX.Element {
  const [emailInput, setEmailInput] = useState('')
  const debouncedEmail = useDebounce(emailInput, 300)
  const [page, setPage] = useState(1)
  const size = 20

  const [viewTarget, setViewTarget] = useState<DireccionAdminRead | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DireccionAdminRead | null>(null)

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [debouncedEmail])

  const params = {
    usuario_email: debouncedEmail || undefined,
    page,
    size,
  }

  const { data, isLoading, isError } = useAdminDirecciones(params)

  const columns = [
    {
      header: 'Usuario',
      render: (d: DireccionAdminRead) => (
        <div>
          <p className="text-fg font-medium text-xs">
            {d.usuario_email ?? `ID #${d.usuario_id}`}
          </p>
          {d.usuario_nombre && (
            <p className="text-fg-muted text-xs">{d.usuario_nombre}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Etiqueta',
      render: (d: DireccionAdminRead) =>
        d.alias ? (
          <span className="text-fg-muted text-xs">{d.alias}</span>
        ) : (
          <span className="text-fg-muted text-xs italic">—</span>
        ),
    },
    {
      header: 'Calle',
      render: (d: DireccionAdminRead) => (
        <span className="text-fg text-xs">{d.linea1}</span>
      ),
    },
    {
      header: 'Ciudad',
      render: (d: DireccionAdminRead) => (
        <span className="text-fg text-xs">{d.ciudad}</span>
      ),
    },
    {
      header: 'CP',
      render: (d: DireccionAdminRead) => (
        <span className="text-fg-muted text-xs">{d.codigo_postal ?? '—'}</span>
      ),
    },
    {
      header: 'Creada',
      render: (d: DireccionAdminRead) =>
        new Date(d.creado_en).toLocaleDateString('es-AR'),
      cellClassName: 'text-fg-muted text-xs',
    },
    {
      header: 'Estado',
      render: (d: DireccionAdminRead) =>
        d.deleted_at !== null ? (
          <Badge variant="danger">Eliminada</Badge>
        ) : (
          <Badge variant="success">Activa</Badge>
        ),
    },
    {
      header: 'Acciones',
      align: 'right' as const,
      render: (d: DireccionAdminRead) => {
        const isDeleted = d.deleted_at !== null
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewTarget(d)}
              aria-label="Ver detalles"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => !isDeleted && setDeleteTarget(d)}
              disabled={isDeleted}
              className={isDeleted ? 'opacity-40 cursor-not-allowed' : 'text-danger-fg hover:bg-danger-bg'}
              aria-label="Eliminar dirección"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title="Direcciones"
        description="Visualizá y gestioná las direcciones de entrega registradas."
        breadcrumb={[{ label: 'Admin' }, { label: 'Direcciones' }]}
      />

      <Toolbar
        filters={
          <Input
            type="text"
            placeholder="Buscar por email de usuario..."
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="w-72"
          />
        }
      />

      {isError && (
        <p className="text-danger-fg text-center py-8">Error al cargar las direcciones.</p>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(d) => d.id}
        loading={isLoading}
        emptyIcon={MapPin}
        emptyTitle="Sin direcciones"
        emptyDescription="No se encontraron direcciones que coincidan con el filtro."
      />

      {data && (
        <PaginationBar
          page={page}
          pages={data.pages}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      {viewTarget !== null && (
        <DireccionDetailDialog
          direccion={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}

      {deleteTarget !== null && (
        <DeleteDireccionDialog
          direccion={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
