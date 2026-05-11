// redesigned in us-009 — Phase 6
import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
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
import {
  Button,
  Input,
  Textarea,
  Badge,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Spinner,
  PageHeader,
  Toolbar,
  DataTable,
  PaginationBar,
} from '../../../shared/ui'
import { cn } from '../../../shared/lib/cn'

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
    <Dialog open onClose={onClose} aria-labelledby="producto-form-title">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle id="producto-form-title">
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modificá los datos del producto y guardá los cambios.'
              : 'Completá el formulario para crear un nuevo producto.'}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 space-y-4 max-h-[55vh] flex-1">
          {isEdit && loadingDetalle ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-fg mb-1">Nombre *</label>
                <Input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Pizza Margarita"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-fg mb-1">Descripción</label>
                <Textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  rows={2}
                  placeholder="Descripción opcional..."
                />
              </div>

              {/* Imagen URL */}
              <div>
                <label className="block text-sm font-medium text-fg mb-1">URL de imagen</label>
                <Input
                  type="text"
                  value={form.imagen_url}
                  onChange={(e) => setForm((p) => ({ ...p, imagen_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              {/* Precio y stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg mb-1">Precio base *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.precio_base}
                    onChange={(e) => setForm((p) => ({ ...p, precio_base: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg mb-1">Stock *</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.stock_cantidad}
                    onChange={(e) => setForm((p) => ({ ...p, stock_cantidad: e.target.value }))}
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
                  className="rounded border-border text-brand-500 focus:ring-ring"
                />
                <label htmlFor="disponible-check" className="text-sm text-fg">
                  Disponible en catálogo
                </label>
              </div>

              {/* Categorías */}
              {todasCategorias.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-fg mb-2">Categorías</label>
                  <div className="flex flex-wrap gap-2">
                    {todasCategorias.map((cat) => (
                      <label
                        key={cat.id}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs cursor-pointer transition select-none',
                          form.catIds.has(cat.id)
                            ? 'bg-brand-100 border-brand-400 text-brand-800'
                            : 'bg-bg-subtle border-border text-fg-muted hover:border-border-strong',
                        )}
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
                  <label className="block text-sm font-medium text-fg mb-2">Ingredientes</label>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {todosIngredientes.map((ing) => (
                      <div key={ing.id} className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={form.ingMap.has(ing.id)}
                            onChange={() => toggleIng(ing.id)}
                            className="rounded border-border text-brand-500 flex-shrink-0"
                          />
                          <span className="truncate">
                            {ing.nombre}
                            {ing.es_alergeno && (
                              <Badge variant="warning" className="ml-1 text-xs">
                                alergeno
                              </Badge>
                            )}
                          </span>
                        </label>
                        {form.ingMap.has(ing.id) && (
                          <label className="flex items-center gap-1 text-xs text-fg-muted cursor-pointer flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={form.ingMap.get(ing.id) ?? false}
                              onChange={() => toggleRemovible(ing.id)}
                              className="rounded border-border text-brand-500"
                            />
                            removible
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-danger-fg font-medium">{error}</p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={saving || (isEdit && loadingDetalle)}
            loading={saving}
          >
            {isEdit ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// DeleteConfirmDialog
// ---------------------------------------------------------------------------

interface DeleteConfirmDialogProps {
  open: boolean
  productoId: number
  onClose: () => void
  onDeleted: () => void
}

function DeleteConfirmDialog({ open, productoId, onClose, onDeleted }: DeleteConfirmDialogProps): JSX.Element {
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: () => deleteProducto(productoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'productos'] })
      onDeleted()
      onClose()
    },
  })

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="delete-product-title">
      <DialogHeader>
        <DialogTitle id="delete-product-title">Eliminar producto</DialogTitle>
        <DialogDescription>
          Esta acción no se puede deshacer. El producto quedará marcado como eliminado y dejará de
          aparecer en el catálogo.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={deleteMutation.isPending}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={() => deleteMutation.mutate()}
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
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const { data, isLoading, isError } = useAdminProductos({
    nombre: nombre || undefined,
    incluir_eliminados: incluirEliminados,
    page,
    size,
  })

  const toggle = useToggleDisponible()

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

  const columns = [
    {
      header: 'Nombre',
      render: (p: ProductoAdminRead) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-fg">{p.nombre}</span>
            {p.eliminado_en !== null && (
              <Badge variant="danger">Eliminado</Badge>
            )}
          </div>
          {p.descripcion && (
            <p className="text-xs text-fg-muted mt-0.5 truncate max-w-xs">{p.descripcion}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Precio',
      render: (p: ProductoAdminRead) =>
        `$${p.precio_base.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    },
    {
      header: 'Stock',
      render: (p: ProductoAdminRead) => p.stock_cantidad,
      cellClassName: 'text-fg-muted',
    },
    {
      header: 'Disponible',
      render: (p: ProductoAdminRead) => (
        <button
          disabled={p.eliminado_en !== null || toggle.isPending}
          onClick={() => toggle.mutate({ id: p.id, disponible: !p.disponible })}
          className={cn(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40',
            p.disponible ? 'bg-brand-500' : 'bg-border',
          )}
          title={p.disponible ? 'Deshabilitar' : 'Habilitar'}
          aria-label={p.disponible ? 'Deshabilitar producto' : 'Habilitar producto'}
        >
          <span
            className={cn(
              'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
              p.disponible ? 'translate-x-4' : 'translate-x-1',
            )}
          />
        </button>
      ),
    },
    {
      header: 'Creado',
      render: (p: ProductoAdminRead) =>
        new Date(p.creado_en).toLocaleDateString('es-AR'),
      cellClassName: 'text-fg-muted text-xs',
    },
    {
      header: 'Acciones',
      align: 'right' as const,
      render: (p: ProductoAdminRead) =>
        p.eliminado_en === null ? (
          <div className="flex items-center gap-1 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEdit(p.id)}
              aria-label="Editar producto"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(p.id)}
              className="text-danger-fg hover:bg-danger-bg"
              aria-label="Eliminar producto"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null,
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title="Productos"
        description="Gestioná el catálogo de productos."
        breadcrumb={[{ label: 'Admin' }, { label: 'Productos' }]}
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo producto
          </Button>
        }
      />

      <Toolbar
        filters={
          <>
            <Input
              type="text"
              placeholder="Buscar por nombre..."
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                setPage(1)
              }}
              className="w-64"
            />
            <label className="flex items-center gap-2 text-sm text-fg cursor-pointer">
              <input
                type="checkbox"
                checked={incluirEliminados}
                onChange={(e) => {
                  setIncluirEliminados(e.target.checked)
                  setPage(1)
                }}
                className="rounded border-border text-brand-500"
              />
              Incluir eliminados
            </label>
          </>
        }
      />

      {isError && (
        <p className="text-danger-fg text-center py-8">Error al cargar los productos.</p>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        keyExtractor={(p) => p.id}
        loading={isLoading}
        emptyIcon={Package}
        emptyTitle="No hay productos"
        emptyDescription="Probá con otro filtro o creá un nuevo producto."
        emptyAction={
          <Button variant="primary" size="sm" onClick={openCreate}>
            Crear producto
          </Button>
        }
      />

      {data && (
        <PaginationBar
          page={page}
          pages={data.pages}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      {modalOpen && (
        <ProductoFormModal
          productoId={editId}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget !== null && (
        <DeleteConfirmDialog
          open
          productoId={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleSaved}
        />
      )}
    </div>
  )
}
