import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AdminCategorias } from '../AdminCategorias'

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
// Mock data — backend returns a tree
// ---------------------------------------------------------------------------
const mockTree = [
  {
    id: 1,
    nombre: 'Pizzas',
    padre_id: null,
    creado_en: '2024-01-01T00:00:00Z',
    hijos: [
      {
        id: 3,
        nombre: 'Pizzas Especiales',
        padre_id: 1,
        creado_en: '2024-01-02T00:00:00Z',
        hijos: [],
      },
    ],
  },
  {
    id: 2,
    nombre: 'Bebidas',
    padre_id: null,
    creado_en: '2024-01-01T00:00:00Z',
    hijos: [],
  },
]

const server = setupServer(
  http.get('http://test-api/api/v1/categorias', () => {
    return HttpResponse.json(mockTree)
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
        <AdminCategorias />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminCategorias', () => {
  it('renders the PageHeader with title "Categorías"', async () => {
    renderPage()
    // Title appears in both breadcrumb and h1 — assert the h1
    expect(screen.getByRole('heading', { name: 'Categorías' })).toBeInTheDocument()
  })

  it('renders category rows after loading', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText('Pizzas')[0]).toBeInTheDocument()
    })
    expect(screen.getByText('Bebidas')).toBeInTheDocument()
    expect(screen.getByText('Pizzas Especiales')).toBeInTheDocument()
  })

  it('opens the create dialog when "Nueva categoría" is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getAllByText('Pizzas')[0]).toBeInTheDocument()
    })

    const createBtn = screen.getByRole('button', { name: /nueva categoría/i })
    await user.click(createBtn)

    await waitFor(() => {
      expect(screen.getByText('Nueva categoría', { selector: 'h2' })).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument()
  })

  it('shows "Raíz" badge for top-level categories', async () => {
    renderPage()
    await waitFor(() => {
      const raizBadges = screen.getAllByText('Raíz')
      expect(raizBadges.length).toBeGreaterThanOrEqual(2) // Pizzas and Bebidas
    })
  })

  it('shows child category with parent indentation prefix', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Pizzas Especiales')).toBeInTheDocument()
    })
    // The └ character should appear in the document
    expect(screen.getByText('└')).toBeInTheDocument()
  })
})
