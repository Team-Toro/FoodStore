import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMe } from '../hooks/useMe'
import { updatePerfil, changePassword } from '../api/authApi'
import { Card, CardBody } from '../../../shared/ui/Card'
import { Input } from '../../../shared/ui/Input'
import { Label } from '../../../shared/ui/Label'
import { Button } from '../../../shared/ui/Button'
import { Badge } from '../../../shared/ui/Badge'
import { Spinner } from '../../../shared/ui/Spinner'

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
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold text-fg">Mi perfil</h1>

      {/* Info de cuenta (solo lectura) */}
      <Card variant="outline">
        <CardBody>
          <p className="text-sm font-medium text-fg-muted mb-1">Email</p>
          <p className="text-fg">{user?.email}</p>
          <p className="text-sm font-medium text-fg-muted mt-3 mb-2">Roles</p>
          <div className="flex gap-2 flex-wrap">
            {user?.roles.map((r) => (
              <Badge key={r} variant="brand">{r}</Badge>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Editar datos personales */}
      <Card variant="outline">
        <CardBody>
          <h2 className="text-base font-semibold text-fg mb-4">Datos personales</h2>
          <form onSubmit={handlePerfilSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="perfil-nombre">Nombre</Label>
                <Input
                  id="perfil-nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="perfil-apellido">Apellido</Label>
                <Input
                  id="perfil-apellido"
                  type="text"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="perfil-telefono">
                Teléfono <span className="text-fg-muted font-normal">(opcional)</span>
              </Label>
              <Input
                id="perfil-telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+54 11 1234-5678"
              />
            </div>
            {perfilMsg && (
              <p className={`text-sm font-medium ${perfilMsg.ok ? 'text-success-fg' : 'text-danger-fg'}`}>
                {perfilMsg.text}
              </p>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={perfilMutation.isPending}
              loading={perfilMutation.isPending}
            >
              {perfilMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Cambiar contraseña */}
      <Card variant="outline">
        <CardBody>
          <h2 className="text-base font-semibold text-fg mb-4">Cambiar contraseña</h2>
          <form onSubmit={handlePassSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pass-actual">Contraseña actual</Label>
              <Input
                id="pass-actual"
                type="password"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label htmlFor="pass-nuevo">Nueva contraseña</Label>
              <Input
                id="pass-nuevo"
                type="password"
                value={passwordNuevo}
                onChange={(e) => setPasswordNuevo(e.target.value)}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <Label htmlFor="pass-confirm">Confirmar nueva contraseña</Label>
              <Input
                id="pass-confirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {passMsg && (
              <p className={`text-sm font-medium ${passMsg.ok ? 'text-success-fg' : 'text-danger-fg'}`}>
                {passMsg.text}
              </p>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={passMutation.isPending}
              loading={passMutation.isPending}
            >
              {passMutation.isPending ? 'Cambiando...' : 'Cambiar contraseña'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
