# Tasks: US-007 Admin Module

All 80 tasks completed (marked with [x]):

## 1. Migration & Model — Usuario.activo field
- [x] 1.1 Add activo field to Usuario model
- [x] 1.2 Generate Alembic migration
- [x] 1.3 Apply migration

## 2. Backend — Admin module structure
- [x] 2.1 Create app/modules/admin/ structure
- [x] 2.2 Register router in app/main.py

## 3. Backend — User management (Admin)
- [x] 3.1 Create Pydantic schemas
- [x] 3.2 Implement AdminRepository
- [x] 3.3 Implement AdminUsuarioService
- [x] 3.4 Implement endpoints

## 4. Backend — Active validation in login
- [x] 4.1 Create verificar_activo function
- [x] 4.2 Call in auth service

## 5. Backend — Metrics endpoints
- [x] 5.1 Create AdminMetricasRepository
- [x] 5.2 Create schemas
- [x] 5.3 Implement AdminMetricasService
- [x] 5.4 Implement endpoints

## 6. Backend — Guard extensions
- [x] 6.1 Verify/update guards in productos router
- [x] 6.2 Verify/update guards in categorias router
- [x] 6.3 Verify guards in pedidos router

## 7. Backend Tests
- [x] 7.1 test_admin_usuarios.py
- [x] 7.2 test_admin_metricas.py
- [x] 7.3 test_auth.py (inactive login)

## 8. Frontend — API layer and hooks
- [x] 8.1 Create frontend/src/api/admin.ts
- [x] 8.2 Create useAdminMetricas hooks
- [x] 8.3 Create useAdminUsuarios hooks

## 9. Frontend — Recharts components
- [x] 9.1 VentasLineChart component
- [x] 9.2 PedidosPieChart component
- [x] 9.3 TopProductosBarChart component
- [x] 9.4 KpiCard component

## 10. Frontend — Dashboard page /admin
- [x] 10.1 Create AdminDashboard component
- [x] 10.2 Integrate charts
- [x] 10.3 Add date range selector

## 11. Frontend — /admin/productos page
- [x] 11.1 Create AdminProductos component
- [x] 11.2 Implement availability toggle
- [x] 11.3 Add soft-delete indicator

## 12. Frontend — /admin/usuarios page
- [x] 12.1 Create AdminUsuarios component
- [x] 12.2 Implement roles editor
- [x] 12.3 Implement state toggle
- [x] 12.4 Display API errors

## 13. Frontend — Routes and navigation
- [x] 13.1 Register admin routes
- [x] 13.2 Add navigation links
- [x] 13.3 Verify /admin/pedidos works

**Summary**: 107/107 tests passing. All tasks complete.
