import { Pencil, Star, Trash2 } from 'lucide-react'
import type { DireccionRead } from '../types'
import { useDeleteDireccion, useSetPredeterminada } from '../hooks'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { cn } from '../../../shared/lib/cn'

interface DireccionCardProps {
  direccion: DireccionRead
  onEdit: (direccion: DireccionRead) => void
}

export function DireccionCard({ direccion, onEdit }: DireccionCardProps): JSX.Element {
  const deleteMutation = useDeleteDireccion()
  const setPrincipalMutation = useSetPredeterminada()

  return (
    <div
      className={cn(
        'border rounded-xl p-4 bg-bg shadow-sm transition-colors',
        direccion.es_principal ? 'border-brand-400' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          {direccion.es_principal && (
            <div className="mb-2">
              <Badge variant="brand">Principal</Badge>
            </div>
          )}
          {direccion.alias && (
            <p className="font-semibold text-fg">{direccion.alias}</p>
          )}
          <p className="text-sm text-fg-muted">{direccion.linea1}</p>
          {direccion.linea2 && (
            <p className="text-sm text-fg-muted">{direccion.linea2}</p>
          )}
          <p className="text-sm text-fg-muted">
            {direccion.ciudad}
            {direccion.codigo_postal ? ` (${direccion.codigo_postal})` : ''}
          </p>
          {direccion.referencia && (
            <p className="text-xs text-fg-muted mt-1">Ref: {direccion.referencia}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4 flex-wrap">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEdit(direccion)}
          aria-label={`Editar dirección ${direccion.alias ?? direccion.linea1}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Editar
        </Button>
        {!direccion.es_principal && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPrincipalMutation.mutate(direccion.id)}
            disabled={setPrincipalMutation.isPending}
            loading={setPrincipalMutation.isPending}
            aria-label={`Marcar ${direccion.alias ?? direccion.linea1} como dirección principal`}
          >
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            {setPrincipalMutation.isPending ? 'Guardando...' : 'Marcar como principal'}
          </Button>
        )}
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (window.confirm('¿Eliminar esta dirección?')) {
              deleteMutation.mutate(direccion.id)
            }
          }}
          disabled={deleteMutation.isPending}
          loading={deleteMutation.isPending}
          aria-label={`Eliminar dirección ${direccion.alias ?? direccion.linea1}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
        </Button>
      </div>

      {deleteMutation.isError && (
        <p className="text-xs text-danger-fg mt-2">
          No se pudo eliminar. La dirección puede tener pedidos activos.
        </p>
      )}
    </div>
  )
}
