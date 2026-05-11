import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCategorias } from '../../../hooks/useCategorias'
import { apiClient } from '../../../api/axiosClient'
import type { IngredienteRead } from '../../../api/catalogo'

interface CatalogoFilters {
  nombre?: string
  categoria_id?: number
  excluir_alergenos?: number[]
}

interface CatalogoFiltersProps {
  onFilterChange: (filters: CatalogoFilters) => void
}

function useAlergenos() {
  return useQuery({
    queryKey: ['ingredientes', 'alergenos'],
    queryFn: async (): Promise<IngredienteRead[]> => {
      const res = await apiClient.get<{ items: IngredienteRead[] }>(
        '/api/v1/ingredientes?es_alergeno=true&size=100',
      )
      return res.data.items
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function CatalogoFilters({ onFilterChange }: CatalogoFiltersProps): JSX.Element {
  const [searchInput, setSearchInput] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState<number | undefined>(undefined)
  const [excluidos, setExcluidos] = useState<Set<number>>(new Set())
  const { data: categorias = [] } = useCategorias()
  const { data: alergenos = [] } = useAlergenos()

  const emitChange = useCallback(
    (nombre: string, categoria_id: number | undefined, excluir: Set<number>) => {
      onFilterChange({
        nombre: nombre.trim() || undefined,
        categoria_id,
        excluir_alergenos: excluir.size > 0 ? Array.from(excluir) : undefined,
      })
    },
    [onFilterChange],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      emitChange(searchInput, selectedCategoria, excluidos)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, selectedCategoria, excluidos, emitChange])

  function handleCategoriaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setSelectedCategoria(val === '' ? undefined : Number(val))
  }

  function toggleAlergeno(id: number) {
    setExcluidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 border border-border rounded-lg px-4 py-2 text-sm bg-bg text-fg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={selectedCategoria ?? ''}
          onChange={handleCategoriaChange}
          className="border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-bg text-fg"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      {alergenos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-fg-muted mr-1">Excluir alérgenos:</span>
          {alergenos.map((al) => {
            const active = excluidos.has(al.id)
            return (
              <button
                key={al.id}
                type="button"
                onClick={() => toggleAlergeno(al.id)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-danger-bg border-danger text-danger-fg'
                    : 'bg-bg-subtle border-border text-fg-muted hover:border-danger/50 hover:text-danger-fg'
                }`}
              >
                {active && <X className="h-3 w-3 mr-1" aria-hidden="true" />}
                {al.nombre}
              </button>
            )
          })}
          {excluidos.size > 0 && (
            <button
              type="button"
              onClick={() => setExcluidos(new Set())}
              className="text-xs text-fg-muted hover:text-fg underline ml-1 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none rounded"
            >
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
