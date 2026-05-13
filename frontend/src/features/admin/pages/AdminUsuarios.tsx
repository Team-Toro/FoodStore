// redesigned in us-009 — Phase 6
import { useCallback, useEffect, useRef, useState } from 'react'
import { Users, ShieldOff } from 'lucide-react'
import { useAdminUsuarios, useUpdateEstado, useUpdateRoles } from '../hooks/useAdminUsuarios'
import type { UsuarioAdminRead } from '../../../api/admin'
import {
  Button,
  Badge,
  Input,
  Select,
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
// Available roles
// ---------------------------------------------------------------------------
const ROLES_DISPONIBLES = ['ADMIN', 'STOCK', 'PEDIDOS', 'CLIENT'] as const

// ---------------------------------------------------------------------------
// Error code → user-facing message mapping
// ---------------------------------------------------------------------------
interface ApiErrorShape {
  response?: {
    status?: number
    headers?: Record<string, string>
    data?: {
      detail?: string
      code?: string
    }
  }
}

function extractApiError(err: unknown): string {
  const apiErr = err as ApiErrorShape
  const status = apiErr?.response?.status
  const errorCode = apiErr?.response?.headers?.['x-error-code']
  const detail = apiErr?.response?.data?.detail
  const code = apiErr?.response?.data?.code ?? errorCode

  // Business-rule specific messages
  if (code === 'LAST_ADMIN' || code === 'LAST_ADMIN_PROTECTED') {
    return 'No se puede quitar el rol ADMIN al último administrador del sistema.'
  }
  if (code === 'SELF_DEACTIVATION' || code === 'SELF_DEACTIVATION_FORBIDDEN') {
    return 'No puedes desactivar tu propia cuenta.'
  }
  if (status === 403) {
    return 'No tenés permisos para realizar esta acción.'
  }
  if (status === 404) {
    return 'Usuario no encontrado.'
  }
  if (detail) {
    return detail
  }
  return 'Ocurrió un error inesperado. Intentá nuevamente.'
}

function isForbiddenError(err: unknown): boolean {
  const apiErr = err as ApiErrorShape
  return apiErr?.response?.status === 403
}

// ---------------------------------------------------------------------------
// EditRolesModal
// ---------------------------------------------------------------------------
interface EditRolesModalProps {
  usuario: UsuarioAdminRead
  onClose: () => void
}

function EditRolesModal({ usuario, onClose }: EditRolesModalProps): JSX.Element {
  const [roles, setRoles] = useState<string[]>(usuario.roles)
  const [apiError, setApiError] = useState<string | null>(null)
  const mutation = useUpdateRoles()
  const firstCheckboxRef = useRef<HTMLInputElement>(null)

  // Focus first checkbox when modal opens for keyboard accessibility
  useEffect(() => {
    const timer = setTimeout(() => {
      firstCheckboxRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  function toggleRol(rol: string) {
    setRoles((prev) =>
      prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol],
    )
  }

  function handleSubmit() {
    setApiError(null)
    mutation.mutate(
      { id: usuario.id, roles },
      {
        onSuccess: () => onClose(),
        onError: (err: unknown) => {
          setApiError(extractApiError(err))
        },
      },
    )
  }

  return (
    <Dialog open onClose={onClose} aria-labelledby="edit-roles-title">
      <DialogHeader>
        <DialogTitle id="edit-roles-title">
          Editar roles — {usuario.nombre} {usuario.apellido}
        </DialogTitle>
        <DialogDescription>
          Seleccioná los roles que tendrá el usuario en el sistema.
        </DialogDescription>
      </DialogHeader>

      <div className="px-6 py-4 space-y-2">
        {ROLES_DISPONIBLES.map((rol, idx) => (
          <label key={rol} className="flex items-center gap-2 cursor-pointer text-sm text-fg">
            <input
              ref={idx === 0 ? firstCheckboxRef : undefined}
              type="checkbox"
              checked={roles.includes(rol)}
              onChange={() => toggleRol(rol)}
              className="rounded border-border text-brand-500 focus:ring-ring"
              aria-label={`Rol ${rol}`}
            />
            {rol}
          </label>
        ))}

        {apiError && (
          <p role="alert" className="text-sm text-danger-fg mt-2">{apiError}</p>
        )}
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={mutation.isPending || roles.length === 0}
          loading={mutation.isPending}
        >
          Guardar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// ConfirmEstadoModal
// ---------------------------------------------------------------------------
interface ConfirmEstadoModalProps {
  usuario: UsuarioAdminRead
  nextActivo: boolean
  onClose: () => void
}

function ConfirmEstadoModal({
  usuario,
  nextActivo,
  onClose,
}: ConfirmEstadoModalProps): JSX.Element {
  const [apiError, setApiError] = useState<string | null>(null)
  const mutation = useUpdateEstado()

  function handleConfirm() {
    setApiError(null)
    mutation.mutate(
      { id: usuario.id, activo: nextActivo },
      {
        onSuccess: () => onClose(),
        onError: (err: unknown) => {
          setApiError(extractApiError(err))
        },
      },
    )
  }

  return (
    <Dialog open onClose={onClose} aria-labelledby="confirm-estado-title">
      <DialogHeader>
        <DialogTitle id="confirm-estado-title">
          {nextActivo ? 'Activar' : 'Desactivar'} usuario
        </DialogTitle>
        <DialogDescription>
          ¿Confirmar {nextActivo ? 'activación' : 'desactivación'} de{' '}
          <strong>
            {usuario.nombre} {usuario.apellido}
          </strong>
          ?
          {!nextActivo && (
            <span className="block mt-1 text-xs text-warning-fg">
              Se revocarán todos los tokens de sesión del usuario.
            </span>
          )}
        </DialogDescription>
      </DialogHeader>

      {apiError && (
        <p role="alert" className="px-6 pb-0 pt-2 text-sm text-danger-fg">{apiError}</p>
      )}

      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button
          variant={nextActivo ? 'primary' : 'danger'}
          onClick={handleConfirm}
          disabled={mutation.isPending}
          loading={mutation.isPending}
        >
          Confirmar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// AdminUsuarios page
// ---------------------------------------------------------------------------
export function AdminUsuarios(): JSX.Element {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [rol, setRol] = useState('')
  const [page, setPage] = useState(1)
  const size = 20

  // debounce 300ms
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearch = useCallback((value: string) => {
    setQ(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedQ(value)
      setPage(1)
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  const { data, isLoading, isError, error } = useAdminUsuarios({
    q: debouncedQ || undefined,
    rol: rol || undefined,
    page,
    size,
  })

  const isForbidden = isError && isForbiddenError(error)

  const [editRolesUser, setEditRolesUser] = useState<UsuarioAdminRead | null>(null)
  const [confirmEstadoUser, setConfirmEstadoUser] = useState<{
    user: UsuarioAdminRead
    nextActivo: boolean
  } | null>(null)

  const columns = [
    {
      header: 'Nombre',
      render: (u: UsuarioAdminRead) => (
        <span>
          {u.nombre} {u.apellido}
          {u.deleted_at && (
            <Badge variant="danger" className="ml-2">eliminado</Badge>
          )}
        </span>
      ),
    },
    {
      header: 'Email',
      render: (u: UsuarioAdminRead) => (
        <span className="text-fg-muted">{u.email}</span>
      ),
    },
    {
      header: 'Roles',
      render: (u: UsuarioAdminRead) => (
        <div className="flex gap-1 flex-wrap">
          {u.roles.map((r) => (
            <Badge key={r} variant="brand">{r}</Badge>
          ))}
        </div>
      ),
    },
    {
      header: 'Estado',
      render: (u: UsuarioAdminRead) => (
        <Badge variant={u.activo ? 'success' : 'danger'}>
          {u.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      header: 'Creado',
      render: (u: UsuarioAdminRead) => (
        <span className="text-fg-muted text-xs">
          {new Date(u.created_at).toLocaleDateString('es-AR')}
        </span>
      ),
    },
    {
      header: 'Acciones',
      align: 'right' as const,
      render: (u: UsuarioAdminRead) => (
        <div className="flex gap-2 justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditRolesUser(u)}
            aria-label={`Editar roles de ${u.nombre} ${u.apellido}`}
          >
            Roles
          </Button>
          <Button
            variant={u.activo ? 'ghost' : 'secondary'}
            size="sm"
            className={u.activo ? 'text-warning-fg hover:bg-warning-bg' : undefined}
            onClick={() => setConfirmEstadoUser({ user: u, nextActivo: !u.activo })}
            aria-label={`${u.activo ? 'Desactivar' : 'Activar'} a ${u.nombre} ${u.apellido}`}
          >
            {u.activo ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ]

  // 403 forbidden state
  if (isForbidden) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <PageHeader
          title="Usuarios"
          description="Gestioná usuarios, roles y estados de acceso."
          breadcrumb={[{ label: 'Admin' }, { label: 'Usuarios' }]}
        />
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <ShieldOff className="h-12 w-12 text-fg-muted" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-fg">Sin permisos</h2>
          <p className="text-sm text-fg-muted max-w-sm">
            No tenés permisos para gestionar usuarios. Esta sección requiere el rol ADMIN.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title="Usuarios"
        description="Gestioná usuarios, roles y estados de acceso."
        breadcrumb={[{ label: 'Admin' }, { label: 'Usuarios' }]}
      />

      <Toolbar
        filters={
          <>
            <Input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={q}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-64"
              aria-label="Buscar usuarios por nombre o email"
            />
            <Select
              value={rol}
              onChange={(e) => {
                setRol(e.target.value)
                setPage(1)
              }}
              className="w-44"
              aria-label="Filtrar por rol"
            >
              <option value="">Todos los roles</option>
              {ROLES_DISPONIBLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </>
        }
      />

      {isError && !isForbidden && (
        <p role="alert" className="text-danger-fg text-center py-8">
          Error al cargar los usuarios. Intentá nuevamente.
        </p>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(u) => u.id}
        loading={isLoading}
        emptyIcon={Users}
        emptyTitle="No hay usuarios"
        emptyDescription="Probá con otro filtro de búsqueda."
      />

      {data && (
        <PaginationBar
          page={page}
          pages={data.pages}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      {/* Modals */}
      {editRolesUser && (
        <EditRolesModal
          usuario={editRolesUser}
          onClose={() => setEditRolesUser(null)}
        />
      )}
      {confirmEstadoUser && (
        <ConfirmEstadoModal
          usuario={confirmEstadoUser.user}
          nextActivo={confirmEstadoUser.nextActivo}
          onClose={() => setConfirmEstadoUser(null)}
        />
      )}
    </div>
  )
}
