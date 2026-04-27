import { useCallback, useEffect, useRef, useState } from 'react'
import { useAdminUsuarios, useUpdateEstado, useUpdateRoles } from '../hooks/useAdminUsuarios'
import type { UsuarioAdminRead } from '../../../api/admin'

// ---------------------------------------------------------------------------
// Available roles
// ---------------------------------------------------------------------------
const ROLES_DISPONIBLES = ['ADMIN', 'STOCK', 'PEDIDOS', 'CLIENT'] as const

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
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            'Error al actualizar roles'
          setApiError(msg)
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-sm mx-4">
        <h3 className="font-semibold text-gray-900 mb-4">
          Editar roles — {usuario.nombre} {usuario.apellido}
        </h3>

        <div className="space-y-2 mb-4">
          {ROLES_DISPONIBLES.map((rol) => (
            <label key={rol} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                checked={roles.includes(rol)}
                onChange={() => toggleRol(rol)}
                className="rounded border-gray-300 text-indigo-600"
              />
              {rol}
            </label>
          ))}
        </div>

        {/* task 12.4 — show API error */}
        {apiError && (
          <p className="text-sm text-red-600 mb-3">{apiError}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending || roles.length === 0}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
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
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            'Error al actualizar estado'
          setApiError(msg)
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-sm mx-4">
        <h3 className="font-semibold text-gray-900 mb-2">
          {nextActivo ? 'Activar' : 'Desactivar'} usuario
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          ¿Confirmar {nextActivo ? 'activación' : 'desactivación'} de{' '}
          <strong>
            {usuario.nombre} {usuario.apellido}
          </strong>
          ?
          {!nextActivo && (
            <span className="block mt-1 text-xs text-amber-600">
              Se revocarán todos los tokens de sesión del usuario.
            </span>
          )}
        </p>

        {/* task 12.4 — show API error */}
        {apiError && (
          <p className="text-sm text-red-600 mb-3">{apiError}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={mutation.isPending}
            className={`flex-1 py-2 rounded-lg text-sm text-white disabled:opacity-50 ${
              nextActivo ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
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

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  const { data, isLoading, isError } = useAdminUsuarios({
    q: debouncedQ || undefined,
    rol: rol || undefined,
    page,
    size,
  })

  const [editRolesUser, setEditRolesUser] = useState<UsuarioAdminRead | null>(null)
  const [confirmEstadoUser, setConfirmEstadoUser] = useState<{
    user: UsuarioAdminRead
    nextActivo: boolean
  } | null>(null)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Usuarios (Admin)</h1>

      {/* Filters — task 12.1 */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64"
        />
        <select
          value={rol}
          onChange={(e) => {
            setRol(e.target.value)
            setPage(1)
          }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Todos los roles</option>
          {ROLES_DISPONIBLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      )}

      {isError && (
        <p className="text-red-600 text-center py-8">Error al cargar los usuarios.</p>
      )}

      {data && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Nombre', 'Email', 'Roles', 'Estado', 'Acciones'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {u.nombre} {u.apellido}
                      {u.deleted_at && (
                        <span className="ml-2 text-xs text-red-500">(eliminado)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.activo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {/* task 12.2 — edit roles modal */}
                        <button
                          onClick={() => setEditRolesUser(u)}
                          className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          Roles
                        </button>
                        {/* task 12.3 — toggle estado with confirm */}
                        <button
                          onClick={() =>
                            setConfirmEstadoUser({ user: u, nextActivo: !u.activo })
                          }
                          className={`text-xs px-2 py-1 text-white rounded ${
                            u.activo
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No hay usuarios para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page} / {data.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
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
