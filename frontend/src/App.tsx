import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './features/auth/pages/LoginPage'
import { RegisterPage } from './features/auth/pages/RegisterPage'
import { RequireAuth } from './features/auth/components/RequireAuth'
import { RequireRoles } from './features/auth/components/RequireRoles'
import { RequireNonAdmin } from './features/auth/components/RequireNonAdmin'
import { Header } from './shared/ui/Header'
import { CatalogoPage } from './features/store/pages/CatalogoPage'
import { CartDrawer } from './features/store/components/CartDrawer'
import { ResultadoPagoPage } from './features/store/pages/ResultadoPagoPage'
import { MisPedidos } from './features/pedidos/pages/MisPedidos'
import { DetallePedidoPage } from './features/pedidos/pages/DetallePedidoPage'
import { GestionPedidos } from './features/admin/pages/GestionPedidos'
import { AdminDashboard } from './features/admin/pages/AdminDashboard'
import { AdminProductos } from './features/admin/pages/AdminProductos'
import { AdminIngredientes } from './features/admin/pages/AdminIngredientes'
import { AdminUsuarios } from './features/admin/pages/AdminUsuarios'
import { AdminCategorias } from './features/admin/pages/AdminCategorias'
import { AdminDirecciones } from './features/admin/pages/AdminDirecciones'
import { DireccionesPage } from './features/direcciones/pages/DireccionesPage'
import { PerfilPage } from './features/auth/pages/PerfilPage'
import { useMe } from './features/auth/hooks/useMe'

function AppLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const { data: user } = useMe()
  const isAdmin = user?.roles.includes('ADMIN') ?? false

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main>{children}</main>
      {/* CartDrawer lives outside route pages — hidden for ADMIN users */}
      {!isAdmin && <CartDrawer />}
    </div>
  )
}

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes — CLIENT only (ADMIN redirected to /admin) */}
        <Route
          path="/catalogo"
          element={
            <RequireNonAdmin>
              <AppLayout>
                <CatalogoPage />
              </AppLayout>
            </RequireNonAdmin>
          }
        />

        {/* Pedidos — CLIENT */}
        <Route
          path="/pedidos"
          element={
            <RequireNonAdmin>
              <AppLayout>
                <MisPedidos />
              </AppLayout>
            </RequireNonAdmin>
          }
        />
        <Route
          path="/pedidos/:id"
          element={
            <RequireNonAdmin>
              <AppLayout>
                <DetallePedidoPage />
              </AppLayout>
            </RequireNonAdmin>
          }
        />
        <Route
          path="/pedidos/:id/resultado"
          element={
            <RequireNonAdmin>
              <AppLayout>
                <ResultadoPagoPage />
              </AppLayout>
            </RequireNonAdmin>
          }
        />

        {/* Perfil */}
        <Route
          path="/perfil"
          element={
            <RequireAuth>
              <AppLayout>
                <PerfilPage />
              </AppLayout>
            </RequireAuth>
          }
        />

        {/* Direcciones — CLIENT */}
        <Route
          path="/perfil/direcciones"
          element={
            <RequireRoles roles={['CLIENT']}>
              <AppLayout>
                <DireccionesPage />
              </AppLayout>
            </RequireRoles>
          }
        />

        {/* Admin routes — ADMIN only */}
        <Route
          path="/admin"
          element={
            <RequireRoles roles={['ADMIN']}>
              <AppLayout>
                <AdminDashboard />
              </AppLayout>
            </RequireRoles>
          }
        />
        <Route
          path="/admin/productos"
          element={
            <RequireRoles roles={['ADMIN']}>
              <AppLayout>
                <AdminProductos />
              </AppLayout>
            </RequireRoles>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <RequireRoles roles={['ADMIN']}>
              <AppLayout>
                <AdminUsuarios />
              </AppLayout>
            </RequireRoles>
          }
        />

        <Route
          path="/admin/categorias"
          element={
            <RequireRoles roles={['ADMIN']}>
              <AppLayout>
                <AdminCategorias />
              </AppLayout>
            </RequireRoles>
          }
        />
        <Route
          path="/admin/direcciones"
          element={
            <RequireRoles roles={['ADMIN']}>
              <AppLayout>
                <AdminDirecciones />
              </AppLayout>
            </RequireRoles>
          }
        />
        <Route
          path="/admin/ingredientes"
          element={
            <RequireRoles roles={['ADMIN']}>
              <AppLayout>
                <AdminIngredientes />
              </AppLayout>
            </RequireRoles>
          }
        />

        {/* Gestión de pedidos — PEDIDOS / ADMIN */}
        <Route
          path="/admin/pedidos"
          element={
            <RequireRoles roles={['PEDIDOS', 'ADMIN']}>
              <AppLayout>
                <GestionPedidos />
              </AppLayout>
            </RequireRoles>
          }
        />

        <Route
          path="/"
          element={
            <RequireAuth>
              <Navigate to="/catalogo" replace />
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
