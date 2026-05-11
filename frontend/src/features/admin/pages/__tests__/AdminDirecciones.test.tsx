import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AdminDirecciones } from '../AdminDirecciones'

vi.stubEnv('VITE_API_URL', 'http://test-api')

// jsdom does not implement HTMLDialogElement.showModal / close — polyfill it
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '')
    }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open')
    }
  }
})

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const mockDirecciones = {
  items: [
    {
      id: 1,
      usuario_id: 10,
      linea1: 'Av. Siempre Viva 742',
      linea2: null,
      ciudad: 'Springfield',
      codigo_postal: '1234',
      referencia: null,
      alias: 'Casa',
      es_principal: true,
      creado_en: '2024-03-01T10:00:00Z',
      actualizado_en: '2024-03-01T10:00:00Z',
      deleted_at: null,
      usuario_email: 'homer@example.com',
      usuario_nombre: 'Homer Simpson',
    },
    {
      id: 2,
      usuario_id: 11,
      linea1: 'Calle Falsa 123',
      linea2: null,
      ciudad: 'Buenos Aires',
      codigo_postal: '5678',
      referencia: null,
      alias: null,
      es_principal: false,
      creado_en: '2024-03-02T10:00:00Z',
      actualizado_en: '2024-03-05T10:00:00Z',
      deleted_at: '2024-03-05T12:00:00Z',
      usuario_email: 'marge@example.com',
      usuario_nombre: 'Marge Simpson',
    },
  ],
  total: 2,
  page: 1,
  size: 20,
  pages: 1,
}

const server = setupServer(
  http.get('http://test-api/api/v1/admin/direcciones', () => {
    return HttpResponse.json(mockDirecciones)
  }),
  http.delete('http://test-api/api/v1/direcciones/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminDirecciones />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminDirecciones', () => {
  it('renders the PageHeader with title "Direcciones"', () => {
    renderPage()
    // Title appears in both breadcrumb and h1 — assert the h1
    expect(screen.getByRole('heading', { name: 'Direcciones' })).toBeInTheDocument()
  })

  it('renders table rows after loading', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Av. Siempre Viva 742')).toBeInTheDocument()
    })
    expect(screen.getByText('Calle Falsa 123')).toBeInTheDocument()
  })

  it('shows "Eliminada" badge for soft-deleted rows', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Eliminada')).toBeInTheDocument()
    })
  })

  it('shows "Activa" badge for active rows', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Activa')).toBeInTheDocument()
    })
  })

  it('disables the delete button for deleted rows', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Eliminada')).toBeInTheDocument()
    })

    // The second row is deleted — its Trash2 button should be disabled
    const deleteButtons = screen.getAllByRole('button', { name: /eliminar dirección/i })
    // The deleted-row button should be disabled
    const disabledBtn = deleteButtons.find((btn) => btn.hasAttribute('disabled'))
    expect(disabledBtn).toBeTruthy()
  })

  it('opens the delete confirmation dialog and calls soft-delete', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Av. Siempre Viva 742')).toBeInTheDocument()
    })

    // Click the delete button for the first (active) row
    const deleteButtons = screen.getAllByRole('button', { name: /eliminar dirección/i })
    const enabledBtn = deleteButtons.find((btn) => !btn.hasAttribute('disabled'))
    expect(enabledBtn).toBeTruthy()
    await user.click(enabledBtn!)

    // Dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/eliminar dirección/i, { selector: 'h2' })).toBeInTheDocument()
    })

    // Confirm delete
    const confirmBtn = screen.getByRole('button', { name: /sí, eliminar/i })
    await user.click(confirmBtn)

    // Dialog closes after success (mock returns 204)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /sí, eliminar/i })).not.toBeInTheDocument()
    })
  })

  it('opens the detail view dialog', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Av. Siempre Viva 742')).toBeInTheDocument()
    })

    const viewButtons = screen.getAllByRole('button', { name: /ver detalles/i })
    await user.click(viewButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Detalle de dirección')).toBeInTheDocument()
    })
  })
})
