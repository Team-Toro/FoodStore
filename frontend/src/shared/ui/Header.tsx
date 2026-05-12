// redesigned in us-009 (Phase 7 — Header, mobile nav, and final polish)
import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ShoppingBag, Menu, X, User, LogOut, ChevronDown, Home, UtensilsCrossed, ClipboardList, LayoutDashboard, FolderOpen, MapPin, PackageSearch, Users, FlaskConical } from 'lucide-react'
import { useLogout } from '../../features/auth/hooks/useLogout'
import { useMe } from '../../features/auth/hooks/useMe'
import { useCartStore } from '../../app/store/cartStore'
import { useUiStore } from '../../app/store/uiStore'
import { Avatar } from './Avatar'
import { Drawer, DrawerHeader, DrawerTitle, DrawerBody } from './Drawer'
import { cn } from '../lib/cn'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'text-sm transition-colors px-1 py-0.5 rounded',
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none',
    isActive
      ? 'text-brand-600 font-medium'
      : 'text-fg-muted hover:text-fg-primary',
  )
}

export function Header(): JSX.Element {
  const navigate = useNavigate()
  const logoutMutation = useLogout()
  const { data: user } = useMe()

  // Reactive inline selectors
  const itemCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.cantidad, 0))
  const openCart = useUiStore((s) => s.openCart)
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const openSidebar = useUiStore((s) => s.openSidebar)
  const closeSidebar = useUiStore((s) => s.closeSidebar)

  // User dropdown
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function handleLogout() {
    setUserMenuOpen(false)
    closeSidebar()
    await logoutMutation.mutateAsync()
    navigate('/login')
  }

  const isAdmin = user?.roles.includes('ADMIN') ?? false
  const isPedidos = user?.roles.includes('PEDIDOS') ?? false
  const isGestion = isAdmin || isPedidos
  const isClient = user?.roles.includes('CLIENT') ?? false
  // ADMIN users do not use the cart/checkout flow
  const showCart = !isAdmin

  // ---- Desktop nav links ----
  const desktopNavLinks = (
    <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-1">
      <NavLink to="/" end className={navLinkClass}>
        Inicio
      </NavLink>
      <NavLink to="/catalogo" className={navLinkClass}>
        Menú
      </NavLink>
      {isClient && (
        <NavLink to="/pedidos" className={navLinkClass}>
          Mis Pedidos
        </NavLink>
      )}
      {isGestion && (
        <NavLink to="/admin" end className={navLinkClass}>
          Gestión
        </NavLink>
      )}
      {isGestion && (
        <NavLink to="/admin/pedidos" className={navLinkClass}>
          Pedidos
        </NavLink>
      )}
      {isAdmin && (
        <NavLink to="/admin/categorias" className={navLinkClass}>
          Categorías
        </NavLink>
      )}
      {isAdmin && (
        <NavLink to="/admin/direcciones" className={navLinkClass}>
          Direcciones
        </NavLink>
      )}
      {isAdmin && (
        <NavLink to="/admin/usuarios" className={navLinkClass}>
          Usuarios
        </NavLink>
      )}
      {isAdmin && (
        <NavLink to="/admin/ingredientes" className={navLinkClass}>
          Ingredientes
        </NavLink>
      )}
    </nav>
  )

  // ---- User name for display ----
  const fullName = user ? `${user.nombre} ${user.apellido}`.trim() : ''

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Sticky header bar                                                   */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* --- Mobile: hamburger (left) --- */}
          <button
            className="md:hidden p-1.5 rounded-md text-fg-muted hover:text-fg-primary focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
            aria-label="Abrir menú de navegación"
            onClick={openSidebar}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* --- Logo (centered on mobile, left on desktop) --- */}
          <Link
            to="/"
            className="flex items-center gap-1.5 font-bold text-brand-600 text-base md:text-lg tracking-tight focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none rounded"
            aria-label="FoodStore — ir al inicio"
          >
            <ShoppingBag className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>FoodStore</span>
          </Link>

          {/* --- Desktop nav (center/left) --- */}
          {desktopNavLinks}

          {/* --- Right side actions --- */}
          <div className="flex items-center gap-2">

            {/* Cart icon button — hidden for ADMIN */}
            {showCart && (
              <button
                onClick={openCart}
                className="relative p-1.5 rounded-md text-fg-muted hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
                aria-label={`Abrir carrito${itemCount > 0 ? `, ${itemCount} ${itemCount === 1 ? 'producto' : 'productos'}` : ''}`}
              >
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                {itemCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 bg-brand-500 text-white text-[0.625rem] font-bold rounded-full min-w-[1.125rem] h-[1.125rem] px-0.5 flex items-center justify-center animate-in zoom-in-50 duration-150"
                    data-testid="cart-badge"
                    aria-hidden="true"
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </button>
            )}

            {/* User menu (desktop) */}
            {user ? (
              <div ref={dropdownRef} className="relative hidden md:block">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label={`Menú de usuario: ${fullName}`}
                >
                  <Avatar name={fullName} size="sm" />
                  <span className="text-sm text-fg-muted max-w-[6rem] truncate hidden lg:block">
                    {user.nombre}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-fg-muted transition-transform duration-150',
                      userMenuOpen && 'rotate-180',
                    )}
                    aria-hidden="true"
                  />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-1.5 w-48 rounded-lg border border-border bg-bg shadow-lg py-1 z-50"
                    role="menu"
                    aria-label="Opciones de usuario"
                  >
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-xs font-semibold text-fg truncate">{fullName}</p>
                      <p className="text-xs text-fg-muted truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/perfil"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-fg hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:bg-bg-subtle"
                    >
                      <User className="h-4 w-4 text-fg-muted" aria-hidden="true" />
                      Ver perfil
                    </Link>
                    <button
                      role="menuitem"
                      onClick={() => void handleLogout()}
                      disabled={logoutMutation.isPending}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-bg transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:bg-danger-bg"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      {logoutMutation.isPending ? 'Saliendo...' : 'Cerrar sesión'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-brand-600 px-2 py-1 rounded focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
              >
                <User className="h-4 w-4" aria-hidden="true" />
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile nav Drawer (side="left")                                      */}
      {/* ------------------------------------------------------------------ */}
      <Drawer
        open={sidebarOpen}
        onClose={closeSidebar}
        side="left"
        panelWidth="w-72"
        aria-label="Navegación móvil"
      >
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-1.5 text-brand-600">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            FoodStore
          </DrawerTitle>
          <button
            onClick={closeSidebar}
            className="p-1 rounded text-fg-muted hover:text-fg-primary focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none transition-colors"
            aria-label="Cerrar menú de navegación"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </DrawerHeader>

        <DrawerBody className="py-2">
          {/* User info block */}
          {user && (
            <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-bg-subtle rounded-lg mx-1">
              <Avatar name={fullName} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{fullName}</p>
                <p className="text-xs text-fg-muted truncate">{user.email}</p>
              </div>
            </div>
          )}

          {/* Nav links */}
          <nav aria-label="Navegación móvil" className="space-y-0.5 px-1">
            <MobileNavLink to="/" end icon={<Home className="h-4 w-4" />} onClick={closeSidebar}>
              Inicio
            </MobileNavLink>
            <MobileNavLink to="/catalogo" icon={<UtensilsCrossed className="h-4 w-4" />} onClick={closeSidebar}>
              Menú
            </MobileNavLink>
            {isClient && (
              <MobileNavLink to="/pedidos" icon={<ClipboardList className="h-4 w-4" />} onClick={closeSidebar}>
                Mis Pedidos
              </MobileNavLink>
            )}
            {isGestion && (
              <MobileNavLink to="/admin" end icon={<LayoutDashboard className="h-4 w-4" />} onClick={closeSidebar}>
                Gestión
              </MobileNavLink>
            )}
            {isGestion && (
              <MobileNavLink to="/admin/pedidos" icon={<PackageSearch className="h-4 w-4" />} onClick={closeSidebar}>
                Pedidos
              </MobileNavLink>
            )}
            {isAdmin && (
              <MobileNavLink to="/admin/categorias" icon={<FolderOpen className="h-4 w-4" />} onClick={closeSidebar}>
                Categorías
              </MobileNavLink>
            )}
            {isAdmin && (
              <MobileNavLink to="/admin/direcciones" icon={<MapPin className="h-4 w-4" />} onClick={closeSidebar}>
                Direcciones
              </MobileNavLink>
            )}
            {isAdmin && (
              <MobileNavLink to="/admin/usuarios" icon={<Users className="h-4 w-4" />} onClick={closeSidebar}>
                Usuarios
              </MobileNavLink>
            )}
            {isAdmin && (
              <MobileNavLink to="/admin/ingredientes" icon={<FlaskConical className="h-4 w-4" />} onClick={closeSidebar}>
                Ingredientes
              </MobileNavLink>
            )}
            {user && (
              <MobileNavLink to="/perfil" icon={<User className="h-4 w-4" />} onClick={closeSidebar}>
                Mi Perfil
              </MobileNavLink>
            )}
          </nav>

          {/* Divider + logout */}
          {user && (
            <div className="mt-4 pt-4 border-t border-border px-1">
              <button
                onClick={() => void handleLogout()}
                disabled={logoutMutation.isPending}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-danger hover:bg-danger-bg rounded-lg transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-danger focus-visible:outline-none"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                {logoutMutation.isPending ? 'Saliendo...' : 'Cerrar sesión'}
              </button>
            </div>
          )}

          {!user && (
            <div className="mt-4 pt-4 border-t border-border px-1">
              <Link
                to="/login"
                onClick={closeSidebar}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-brand-600 font-medium hover:bg-brand-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
              >
                <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                Iniciar sesión
              </Link>
            </div>
          )}
        </DrawerBody>
      </Drawer>
    </>
  )
}

// ---- Helper: mobile nav link ----
interface MobileNavLinkProps {
  to: string
  end?: boolean
  icon: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
}

function MobileNavLink({ to, end, icon, children, onClick }: MobileNavLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors',
          'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none',
          isActive
            ? 'bg-brand-50 text-brand-600 font-medium'
            : 'text-fg hover:bg-bg-subtle',
        )
      }
    >
      <span className="text-fg-muted" aria-hidden="true">{icon}</span>
      {children}
    </NavLink>
  )
}
