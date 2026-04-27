import { create } from 'zustand'

interface UiState {
  cartOpen: boolean
  sidebarOpen: boolean
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  cartOpen: false,
  sidebarOpen: false,

  toggleCart(): void {
    set((state) => ({ cartOpen: !state.cartOpen }))
  },

  openCart(): void {
    set({ cartOpen: true })
  },

  closeCart(): void {
    set({ cartOpen: false })
  },

  toggleSidebar(): void {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }))
  },

  openSidebar(): void {
    set({ sidebarOpen: true })
  },

  closeSidebar(): void {
    set({ sidebarOpen: false })
  },
}))
