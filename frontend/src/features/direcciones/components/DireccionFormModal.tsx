import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { DireccionCreate, DireccionRead, DireccionUpdate } from '../types'
import { useCreateDireccion, useUpdateDireccion } from '../hooks'
import { Input } from '../../../shared/ui/Input'
import { Label } from '../../../shared/ui/Label'
import { Button } from '../../../shared/ui/Button'
import { FieldError } from '../../../shared/ui/FieldError'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay/50 p-4">
      <div className="bg-bg rounded-xl shadow-xl w-full max-w-md border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-fg">
            {isEdit ? 'Editar dirección' : 'Agregar dirección'}
          </h2>
          <button
            onClick={onClose}
            className="text-fg-muted hover:text-fg transition-colors p-1 rounded focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          <div>
            <Label htmlFor="dir-linea1">
              Dirección <span className="text-danger-fg" aria-hidden="true">*</span>
            </Label>
            <Input
              id="dir-linea1"
              type="text"
              value={linea1}
              onChange={(e) => setLinea1(e.target.value)}
              placeholder="Av. Corrientes 1234"
              required
            />
          </div>

          <div>
            <Label htmlFor="dir-linea2">Piso / Departamento</Label>
            <Input
              id="dir-linea2"
              type="text"
              value={linea2}
              onChange={(e) => setLinea2(e.target.value)}
              placeholder="Piso 3, Dpto B"
            />
          </div>

          <div>
            <Label htmlFor="dir-ciudad">
              Ciudad <span className="text-danger-fg" aria-hidden="true">*</span>
            </Label>
            <Input
              id="dir-ciudad"
              type="text"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              placeholder="Buenos Aires"
              required
            />
          </div>

          <div>
            <Label htmlFor="dir-cp">Código Postal</Label>
            <Input
              id="dir-cp"
              type="text"
              value={codigoPostal}
              onChange={(e) => setCodigoPostal(e.target.value)}
              placeholder="C1414"
            />
          </div>

          <div>
            <Label htmlFor="dir-ref">Referencia</Label>
            <Input
              id="dir-ref"
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Entre calles..."
            />
          </div>

          <div>
            <Label htmlFor="dir-alias">Alias</Label>
            <Input
              id="dir-alias"
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Casa, Trabajo..."
            />
          </div>

          {error && <FieldError>{error}</FieldError>}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={isPending}
              loading={isPending}
            >
              {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
