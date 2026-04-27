import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LoginPage } from '../features/auth/pages/LoginPage'

vi.stubEnv('VITE_API_URL', 'http://test-api')

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderLoginPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
  })

  it('shows validation errors for empty form submit', async () => {
    const user = userEvent.setup()
    renderLoginPage()
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    await waitFor(() => {
      expect(screen.getByText(/email es requerido/i)).toBeInTheDocument()
    })
  })

  it('navigates to home on successful login', async () => {
    server.use(
      http.post('http://test-api/api/v1/auth/login', () => {
        return HttpResponse.json({
          access_token: 'tok',
          refresh_token: 'ref',
          token_type: 'bearer',
          expires_in: 1800,
        })
      }),
    )

    const user = userEvent.setup()
    renderLoginPage()
    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'password123')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument()
    })
  })

  it('shows INVALID_CREDENTIALS error', async () => {
    server.use(
      http.post('http://test-api/api/v1/auth/login', () => {
        return HttpResponse.json(
          { detail: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' },
          { status: 401 },
        )
      }),
    )

    const user = userEvent.setup()
    renderLoginPage()
    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    await waitFor(() => {
      expect(screen.getByText(/email o contraseña incorrectos/i)).toBeInTheDocument()
    })
  })

  it('shows rate limit error message', async () => {
    server.use(
      http.post('http://test-api/api/v1/auth/login', () => {
        return HttpResponse.json(
          {
            detail: 'Demasiados intentos, reintenta en 60 segundos',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          { status: 429 },
        )
      }),
    )

    const user = userEvent.setup()
    renderLoginPage()
    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'password123')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    await waitFor(() => {
      expect(screen.getByText(/demasiados intentos/i)).toBeInTheDocument()
    })
  })
})
