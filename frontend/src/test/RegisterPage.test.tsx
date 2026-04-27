import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RegisterPage } from '../features/auth/pages/RegisterPage'

vi.stubEnv('VITE_API_URL', 'http://test-api')

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderRegisterPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RegisterPage', () => {
  it('renders all form fields', () => {
    renderRegisterPage()
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/apellido/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument()
  })

  it('navigates to home on successful registration', async () => {
    server.use(
      http.post('http://test-api/api/v1/auth/register', () => {
        return HttpResponse.json({
          access_token: 'tok',
          refresh_token: 'ref',
          token_type: 'bearer',
          expires_in: 1800,
        }, { status: 201 })
      }),
    )

    const user = userEvent.setup()
    renderRegisterPage()
    await user.type(screen.getByLabelText(/^nombre$/i), 'Juan')
    await user.type(screen.getByLabelText(/apellido/i), 'Perez')
    await user.type(screen.getByLabelText(/email/i), 'juan@example.com')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'password123')
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'password123')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument()
    })
  })

  it('shows EMAIL_ALREADY_EXISTS error', async () => {
    server.use(
      http.post('http://test-api/api/v1/auth/register', () => {
        return HttpResponse.json(
          {
            detail: 'El email ya está registrado',
            code: 'EMAIL_ALREADY_EXISTS',
            field: 'email',
          },
          { status: 409 },
        )
      }),
    )

    const user = userEvent.setup()
    renderRegisterPage()
    await user.type(screen.getByLabelText(/^nombre$/i), 'Juan')
    await user.type(screen.getByLabelText(/apellido/i), 'Perez')
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'password123')
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'password123')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => {
      expect(screen.getByText(/email ya está registrado/i)).toBeInTheDocument()
    })
  })

  it('shows validation error when passwords do not match', async () => {
    const user = userEvent.setup()
    renderRegisterPage()
    await user.type(screen.getByLabelText(/^nombre$/i), 'Juan')
    await user.type(screen.getByLabelText(/apellido/i), 'Perez')
    await user.type(screen.getByLabelText(/email/i), 'juan@example.com')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'password123')
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'different')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => {
      expect(screen.getByText(/contraseñas no coinciden/i)).toBeInTheDocument()
    })
  })
})
