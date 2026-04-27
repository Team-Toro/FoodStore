import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../hooks/useMe'
import { updatePerfil, changePassword } from '../api/authApi'

export function PerfilPage(): JSX.Element {
  const queryClient = useQueryClient()
  const { data: user, isLoading } = useMe()

  // --- Perfil form ---
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [perfilInited, setPerfilInited] = useState(false)
  const [perfilMsg, setPerfilMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Pre-fill once user data arrives
  if (user && !perfilInited) {
    setNombre(user.nombre)
    setApellido(user.apellido)
    setTelefono(user.telefono ?? '')
    setPerfilInited(true)
  }

  const perfilMutation = useMutation({
    mutationFn: () =>
      updatePerfil({
        nombre: nombre.trim() || undefined,
        apellido: apellido.trim() || undefined,
        telefono: telefono.trim() || undefined,
      }),
    onSuccess: (updated) => {
      void queryClient.setQueryData(['me'], updated)
      setPerfilMsg({ ok: true, text: 'Perfil actualizado correctamente.' })
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Error al actualizar el perfil.'
      setPerfilMsg({ ok: false, text: msg })
    },
  })

  // --- Password form ---
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNuevo, setPasswordNuevo] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const passMutation = useMutation({
    mutationFn: () =>
      changePassword({ password_actual: passwordActual, password_nuevo: passwordNuevo }),
    onSuccess: () => {
      setPasswordActual('')
      setPasswordNuevo('')
      setPasswordConfirm('')
      setPassMsg({ ok: true, text: 'Contraseña cambiada correctamente.' })
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Error al cambiar la contraseña.'
      setPassMsg({ ok: false, text: msg })
    },
  })

  function handlePerfilSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPerfilMsg(null)
    perfilMutation.mutate()
  }

  function handlePassSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPassMsg(null)
    if (passwordNuevo !== passwordConfirm) {
      setPassMsg({ ok: false, text: 'Las contraseñas nuevas no coinciden.' })
      return
    }
    if (passwordNuevo.length < 8) {
      setPassMsg({ ok: false, text: 'La nueva contraseña debe tener al menos 8 caracteres.' })
      return
    }
    passMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>

      {/* Info de cuenta (solo lectura) */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
        <p className="text-gray-900">{user?.email}</p>
        <p className="text-sm font-medium text-gray-500 mt-3 mb-1">Roles</p>
        <div className="flex gap-2 flex-wrap">
          {user?.roles.map((r) => (
            <span
              key={r}
              className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700"
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Editar datos personales */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Datos personales</h2>
        <form onSubmit={handlePerfilSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="+54 11 1234-5678"
            />
          </div>
          {perfilMsg && (
            <p className={`text-sm font-medium ${perfilMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
              {perfilMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={perfilMutation.isPending}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {perfilMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Cambiar contraseña</h2>
        <form onSubmit={handlePassSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
            <input
              type="password"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={passwordNuevo}
              onChange={(e) => setPasswordNuevo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar nueva contraseña
            </label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              autoComplete="new-password"
            />
          </div>
          {passMsg && (
            <p className={`text-sm font-medium ${passMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
              {passMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={passMutation.isPending}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {passMutation.isPending ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
