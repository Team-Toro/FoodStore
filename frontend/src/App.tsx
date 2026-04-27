import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './features/auth/pages/LoginPage'
import { RegisterPage } from './features/auth/pages/RegisterPage'
import { RequireAuth } from './features/auth/components/RequireAuth'
import { RequireRoles } from './features/auth/components/RequireRoles'
import { Header } from './shared/ui/Header'
import { CatalogoPage } from './features/store/pages/CatalogoPage'
import { CartDrawer } from './features/store/components/CartDrawer'
import { ResultadoPagoPage } from './features/store/pages/ResultadoPagoPage'
import { MisPedidos } from './features/pedidos/pages/MisPedidos'
import { DetallePedidoPage } from './features/pedidos/pages/DetallePedidoPage'
import { GestionPedidos } from './features/admin/pages/GestionPedidos'
import { AdminDashboard } from './features/admin/pages/AdminDashboard'
import { AdminProductos } from './features/admin/pages/AdminProductos'
import { AdminUsuarios } from './features/admin/pages/AdminUsuarios'
import { DireccionesPage } from './features/direcciones/pages/DireccionesPage'
import { PerfilPage } from './features/auth/pages/PerfilPage'

function AppLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>{children}</main>
      {/* CartDrawer lives outside route pages so it's available everywhere */}
      <CartDrawer />
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

        {/* Protected routes */}
        <Route
          path="/catalogo"
          element={
            <RequireAuth>
              <AppLayout>
                <CatalogoPage />
              </AppLayout>
            </RequireAuth>
          }
        />

        {/* Pedidos — CLIENT */}
        <Route
          path="/pedidos"
          element={
            <RequireAuth>
              <AppLayout>
                <MisPedidos />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/pedidos/:id"
          element={
            <RequireAuth>
              <AppLayout>
                <DetallePedidoPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/pedidos/:id/resultado"
          element={
            <RequireAuth>
              <AppLayout>
                <ResultadoPagoPage />
              </AppLayout>
            </RequireAuth>
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
