import { Link, useNavigate } from 'react-router-dom'
import { useLogout } from '../../features/auth/hooks/useLogout'
import { useMe } from '../../features/auth/hooks/useMe'
import { useCartStore } from '../../app/store/cartStore'
import { useUiStore } from '../../app/store/uiStore'

export function Header(): JSX.Element {
  const navigate = useNavigate()
  const logoutMutation = useLogout()
  const { data: user } = useMe()
  const count = useCartStore((s) => s.items.reduce((acc, i) => acc + i.cantidad, 0))
  const openCart = useUiStore((s) => s.openCart)

  async function handleLogout() {
    await logoutMutation.mutateAsync()
    navigate('/login')
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="text-lg font-semibold text-indigo-600">Food Store</span>
        <div className="flex items-center gap-4">
          {/* Admin navigation — task 13.2 */}
          {user?.roles.includes('ADMIN') && (
            <nav className="hidden sm:flex items-center gap-3 text-sm">
              <Link to="/admin" className="text-gray-600 hover:text-indigo-600 transition-colors">
                Dashboard
              </Link>
              <Link to="/admin/productos" className="text-gray-600 hover:text-indigo-600 transition-colors">
                Productos
              </Link>
              <Link to="/admin/usuarios" className="text-gray-600 hover:text-indigo-600 transition-colors">
                Usuarios
              </Link>
              <Link to="/admin/pedidos" className="text-gray-600 hover:text-indigo-600 transition-colors">
                Pedidos
              </Link>
            </nav>
          )}

          {/* Client navigation */}
          {user?.roles.includes('CLIENT') && (
            <nav className="hidden sm:flex items-center gap-3 text-sm">
              <Link to="/pedidos" className="text-gray-600 hover:text-indigo-600 transition-colors">
                Mis Pedidos
              </Link>
              <Link to="/perfil/direcciones" className="text-gray-600 hover:text-indigo-600 transition-colors">
                Mis Direcciones
              </Link>
            </nav>
          )}

          {user && (
            <Link to="/perfil" className="text-sm text-gray-700 hover:text-indigo-600 transition-colors">
              Hola, {user.nombre}
            </Link>
          )}

          {/* Cart icon with badge */}
          <button
            onClick={openCart}
            className="relative text-gray-600 hover:text-indigo-600 transition-colors"
            aria-label="Abrir carrito"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9m-6-9v9m-4-9v9"
              />
            </svg>
            {count > 0 && (
              <span
                className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                data-testid="cart-badge"
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="text-sm text-gray-600 hover:text-red-600 disabled:opacity-50"
          >
            {logoutMutation.isPending ? 'Saliendo...' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </header>
  )
}
