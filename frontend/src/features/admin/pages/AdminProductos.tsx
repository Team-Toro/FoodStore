import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAdminProductos,
  patchProductoDisponible,
  type ProductoAdminRead,
} from '../../../api/admin'
import {
  getCategorias,
  getIngredientes,
  getProductoDetail,
  createProducto,
  updateProducto,
  deleteProducto,
  syncCategorias,
  syncIngredientes,
  type CategoriaFlat,
  type IngredienteRead,
  type ProductoDetail,
} from '../../../api/catalogo'

// ---------------------------------------------------------------------------
// Form state helpers
// ---------------------------------------------------------------------------

interface FormState {
  nombre: string
  descripcion: string
  imagen_url: string
  precio_base: string
  stock_cantidad: string
  disponible: boolean
  catIds: Set<number>
  ingMap: Map<number, boolean> // ingrediente_id → es_removible
}

function emptyForm(): FormState {
  return {
    nombre: '',
    descripcion: '',
    imagen_url: '',
    precio_base: '',
    stock_cantidad: '0',
    disponible: true,
    catIds: new Set(),
    ingMap: new Map(),
  }
}

function detailToForm(d: ProductoDetail): FormState {
  return {
    nombre: d.nombre,
    descripcion: d.descripcion ?? '',
    imagen_url: d.imagen_url ?? '',
    precio_base: String(d.precio_base),
    stock_cantidad: String(d.stock_cantidad),
    disponible: d.disponible,
    catIds: new Set(d.categorias.map((c) => c.id)),
    ingMap: new Map(d.ingredientes.map((i) => [i.id, i.es_removible])),
  }
}

// ---------------------------------------------------------------------------
// ProductoFormModal
// ---------------------------------------------------------------------------

interface ProductoFormModalProps {
  productoId: number | null // null = create, number = edit
  onClose: () => void
  onSaved: () => void
}

function ProductoFormModal({ productoId, onClose, onSaved }: ProductoFormModalProps): JSX.Element {
  const isEdit = productoId !== null
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: todasCategorias = [] } = useQuery<CategoriaFlat[]>({
    queryKey: ['catalogo', 'categorias'],
    queryFn: getCategorias,
    staleTime: 1000 * 60 * 5,
  })

  const { data: todosIngredientes = [] } = useQuery<IngredienteRead[]>({
    queryKey: ['catalogo', 'ingredientes'],
    queryFn: getIngredientes,
    staleTime: 1000 * 60 * 5,
  })

  const { data: detalle, isLoading: loadingDetalle } = useQuery<ProductoDetail>({
    queryKey: ['catalogo', 'producto-detail', productoId],
    queryFn: () => getProductoDetail(productoId!),
    enabled: isEdit,
    staleTime: 0,
  })

  useEffect(() => {
    if (detalle) setForm(detailToForm(detalle))
  }, [detalle])

  function toggleCat(id: number) {
    setForm((prev) => {
      const next = new Set(prev.catIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...prev, catIds: next }
    })
  }

  function toggleIng(id: number) {
    setForm((prev) => {
      const next = new Map(prev.ingMap)
      if (next.has(id)) next.delete(id)
      else next.set(id, false)
      return { ...prev, ingMap: next }
    })
  }

  function toggleRemovible(id: number) {
    setForm((prev) => {
      const next = new Map(prev.ingMap)
      if (next.has(id)) next.set(id, !next.get(id))
      return { ...prev, ingMap: next }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const precio = parseFloat(form.precio_base)
    const stock = parseInt(form.stock_cantidad, 10)
    if (!form.nombre.trim()) return setError('El nombre es requerido')
    if (isNaN(precio) || precio <= 0) return setError('El precio debe ser mayor a 0')
    if (isNaN(stock) || stock < 0) return setError('El stock no puede ser negativo')

    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        imagen_url: form.imagen_url.trim() || null,
        precio_base: precio,
        stock_cantidad: stock,
        disponible: form.disponible,
      }

      let id: number
      if (isEdit) {
        await updateProducto(productoId, payload)
        id = productoId
      } else {
        const created = await createProducto(payload)
        id = created.id
      }

      await syncCategorias(id, Array.from(form.catIds))
      await syncIngredientes(
        id,
        Array.from(form.ingMap.entries()).map(([ingrediente_id, es_removible]) => ({
          ingrediente_id,
          es_removible,
        })),
      )

      onSaved()
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Error al guardar el producto'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {isEdit && loadingDetalle ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <>
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej: Pizza Margarita"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Descripción opcional..."
                />
              </div>

              {/* Imagen URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de imagen</label>
                <input
                  type="text"
                  value={form.imagen_url}
                  onChange={(e) => setForm((p) => ({ ...p, imagen_url: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>

              {/* Precio y stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio base *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.precio_base}
                    onChange={(e) => setForm((p) => ({ ...p, precio_base: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock_cantidad}
                    onChange={(e) => setForm((p) => ({ ...p, stock_cantidad: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Disponible */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="disponible-check"
                  checked={form.disponible}
                  onChange={(e) => setForm((p) => ({ ...p, disponible: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <label htmlFor="disponible-check" className="text-sm text-gray-700">
                  Disponible en catálogo
                </label>
              </div>

              {/* Categorías */}
              {todasCategorias.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categorías</label>
                  <div className="flex flex-wrap gap-2">
                    {todasCategorias.map((cat) => (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs cursor-pointer transition select-none ${
                          form.catIds.has(cat.id)
                            ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                            : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.catIds.has(cat.id)}
                          onChange={() => toggleCat(cat.id)}
                          className="sr-only"
                        />
                        {cat.padre_id !== null ? `↳ ${cat.nombre}` : cat.nombre}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Ingredientes */}
              {todosIngredientes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ingredientes</label>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {todosIngredientes.map((ing) => (
                      <div key={ing.id} className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={form.ingMap.has(ing.id)}
                            onChange={() => toggleIng(ing.id)}
                            className="rounded border-gray-300 text-indigo-600 flex-shrink-0"
                          />
                          <span className="truncate">
                            {ing.nombre}
                            {ing.es_alergeno && (
                              <span className="ml-1 text-xs text-orange-600 font-medium">⚠ alergeno</span>
                            )}
                          </span>
                        </label>
                        {form.ingMap.has(ing.id) && (
                          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={form.ingMap.get(ing.id) ?? false}
                              onChange={() => toggleRemovible(ing.id)}
                              className="rounded border-gray-300 text-indigo-600"
                            />
                            removible
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || (isEdit && loadingDetalle)}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
          >
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useAdminProductos(params: {
  nombre?: string
  incluir_eliminados?: boolean
  page: number
  size: number
}) {
  return useQuery({
    queryKey: ['admin', 'productos', params],
    queryFn: () => getAdminProductos(params),
    staleTime: 1000 * 30,
  })
}

function useToggleDisponible() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, disponible }: { id: number; disponible: boolean }) =>
      patchProductoDisponible(id, disponible),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'productos'] })
    },
  })
}

// ---------------------------------------------------------------------------
// ProductoRow
// ---------------------------------------------------------------------------

interface ProductoRowProps {
  producto: ProductoAdminRead
  onEdit: (id: number) => void
}

function ProductoRow({ producto, onEdit }: ProductoRowProps): JSX.Element {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const queryClient = useQueryClient()
  const toggle = useToggleDisponible()
  const isDeleted = producto.eliminado_en !== null

  const deleteMutation = useMutation({
    mutationFn: () => deleteProducto(producto.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'productos'] })
      setConfirmingDelete(false)
    },
  })

  return (
    <tr className={`border-b transition ${isDeleted ? 'opacity-50 bg-red-50' : 'hover:bg-gray-50'}`}>
      <td className="px-4 py-3 text-sm text-gray-900">
        <div className="flex items-center gap-2">
          <span className="font-medium">{producto.nombre}</span>
          {isDeleted && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              Eliminado
            </span>
          )}
        </div>
        {producto.descripcion && (
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{producto.descripcion}</p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">
        ${producto.precio_base.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{producto.stock_cantidad}</td>
      <td className="px-4 py-3">
        <button
          disabled={isDeleted || toggle.isPending}
          onClick={() => toggle.mutate({ id: producto.id, disponible: !producto.disponible })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 ${
            producto.disponible ? 'bg-indigo-600' : 'bg-gray-300'
          }`}
          title={producto.disponible ? 'Deshabilitar' : 'Habilitar'}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              producto.disponible ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {new Date(producto.creado_en).toLocaleDateString('es-AR')}
      </td>
      <td className="px-4 py-3">
        {!isDeleted && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onEdit(producto.id)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Editar
            </button>
            {confirmingDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="text-xs text-red-600 font-semibold hover:text-red-800"
                >
                  {deleteMutation.isPending ? '...' : 'Sí, eliminar'}
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Eliminar
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// AdminProductos page
// ---------------------------------------------------------------------------

export function AdminProductos(): JSX.Element {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [incluirEliminados, setIncluirEliminados] = useState(false)
  const [page, setPage] = useState(1)
  const size = 20

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const { data, isLoading, isError } = useAdminProductos({
    nombre: nombre || undefined,
    incluir_eliminados: incluirEliminados,
    page,
    size,
  })

  function openCreate() {
    setEditId(null)
    setModalOpen(true)
  }

  function openEdit(id: number) {
    setEditId(id)
    setModalOpen(true)
  }

  function handleSaved() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'productos'] })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
        <button
          onClick={openCreate}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Nuevo producto
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={incluirEliminados}
            onChange={(e) => { setIncluirEliminados(e.target.checked); setPage(1) }}
            className="rounded border-gray-300 text-indigo-600"
          />
          Incluir eliminados
        </label>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      )}

      {isError && (
        <p className="text-red-600 text-center py-8">Error al cargar los productos.</p>
      )}

      {data && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Nombre', 'Precio', 'Stock', 'Disponible', 'Creado', 'Acciones'].map((h) => (
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
                {data.items.map((p) => (
                  <ProductoRow key={p.id} producto={p} onEdit={openEdit} />
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No hay productos para mostrar.
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

      {modalOpen && (
        <ProductoFormModal
          productoId={editId}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
