import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RequireNonAdmin } from '../RequireNonAdmin'
import { useAuthStore } from '../../../../app/store/authStore'

vi.stubEnv('VITE_API_URL', 'http://test-api')

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => {
  server.resetHandlers()
  useAuthStore.setState({ accessToken: null })
})
afterAll(() => server.close())

function renderWithRouter(initialPath: string, meResponse: object | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  if (meResponse) {
    useAuthStore.setState({ accessToken: 'fake-token' })
    server.use(
      http.get('http://test-api/api/v1/auth/me', () => HttpResponse.json(meResponse)),
    )
  }

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/admin" element={<div>Admin Dashboard</div>} />
          <Route
            path="/catalogo"
            element={
              <RequireNonAdmin>
                <div>Catalogo Page</div>
              </RequireNonAdmin>
            }
          />
          <Route
            path="/pedidos"
            element={
              <RequireNonAdmin>
                <div>Pedidos Page</div>
              </RequireNonAdmin>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RequireNonAdmin', () => {
  it('redirects unauthenticated user to /login', () => {
    renderWithRouter('/catalogo')
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('redirects ADMIN user from /catalogo to /admin', async () => {
    renderWithRouter('/catalogo', {
      id: 1,
      nombre: 'Admin',
      apellido: 'User',
      email: 'admin@test.com',
      roles: ['ADMIN'],
    })

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    })
  })

  it('redirects ADMIN user from /pedidos to /admin', async () => {
    renderWithRouter('/pedidos', {
      id: 1,
      nombre: 'Admin',
      apellido: 'User',
      email: 'admin@test.com',
      roles: ['ADMIN'],
    })

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    })
  })

  it('allows CLIENT user to access /catalogo', async () => {
    renderWithRouter('/catalogo', {
      id: 2,
      nombre: 'John',
      apellido: 'Doe',
      email: 'john@test.com',
      roles: ['CLIENT'],
    })

    await waitFor(() => {
      expect(screen.getByText('Catalogo Page')).toBeInTheDocument()
    })
  })

  it('allows CLIENT user to access /pedidos', async () => {
    renderWithRouter('/pedidos', {
      id: 2,
      nombre: 'John',
      apellido: 'Doe',
      email: 'john@test.com',
      roles: ['CLIENT'],
    })

    await waitFor(() => {
      expect(screen.getByText('Pedidos Page')).toBeInTheDocument()
    })
  })
})
