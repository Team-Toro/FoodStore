import { useState, useEffect, useCallback } from 'react'
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
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <select
          value={selectedCategoria ?? ''}
          onChange={handleCategoriaChange}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
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
          <span className="text-xs font-medium text-gray-500 mr-1">Excluir alérgenos:</span>
          {alergenos.map((al) => {
            const active = excluidos.has(al.id)
            return (
              <button
                key={al.id}
                type="button"
                onClick={() => toggleAlergeno(al.id)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-red-100 border-red-400 text-red-700'
                    : 'bg-gray-100 border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-600'
                }`}
              >
                {active && <span className="mr-1">✕</span>}
                {al.nombre}
              </button>
            )
          })}
          {excluidos.size > 0 && (
            <button
              type="button"
              onClick={() => setExcluidos(new Set())}
              className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
            >
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
