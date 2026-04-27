# Design: US-007 Admin Module

## Architecture
Backend: FastAPI routers + Services + Repositories + Models
Frontend: Feature-sliced design with TanStack Query + Zustand + Recharts

## Key Components
- AdminRepository: user listings, metrics queries
- AdminService: business logic, role management, state management
- Admin endpoints: /api/v1/admin/usuarios, /admin/metricas, /admin/productos
- Frontend hooks: useAdminMetricas, useAdminUsuarios
- Charts: VentasLineChart, PedidosPieChart, TopProductosBarChart

## State Management
- TanStack Query: server state (metrics, users)
- Zustand: client state (auth, cart, payment)

## Database
- Usuario.activo field for account deactivation
- HistorialEstadoPedido append-only pattern
- DetallePedido snapshot fields
- RefreshToken revocation on role/state changes
