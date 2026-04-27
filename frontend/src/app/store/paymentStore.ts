import { create } from 'zustand'

type PaymentStatus =
  | 'idle'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'in_process'
  | 'error'

interface PaymentState {
  status: PaymentStatus
  mpPaymentId: string | null
  /** Raw mp_status string returned by the backend / MP callback */
  mp_status: string | null
  /** Raw mp_payment_id string returned by MP callback query param */
  mp_payment_id: string | null
  /** Selected delivery address ID for the current checkout flow.
   *  null  = retiro en local (no address)
   *  undefined = not yet selected (pre-selection pending)
   */
  direccionSeleccionadaId: number | null | undefined
  setStatus: (status: PaymentStatus) => void
  setMpPaymentId: (id: string) => void
  /** Set result from MP callback: maps mp_status to internal PaymentStatus */
  setPagoResult: (mp_status: string, mp_payment_id: string | null) => void
  /** Set the selected delivery address (null = retiro en local) */
  setDireccionSeleccionada: (id: number | null) => void
  /** Alias for reset — clear state before starting a new checkout flow */
  resetPayment: () => void
  reset: () => void
}

const initialState = {
  status: 'idle' as PaymentStatus,
  mpPaymentId: null,
  mp_status: null,
  mp_payment_id: null,
  direccionSeleccionadaId: undefined as number | null | undefined,
}

function mpStatusToInternal(mp_status: string): PaymentStatus {
  switch (mp_status) {
    case 'approved':
      return 'approved'
    case 'rejected':
      return 'rejected'
    case 'pending':
    case 'in_process':
      return 'in_process'
    default:
      return 'error'
  }
}

export const usePaymentStore = create<PaymentState>()((set) => ({
  ...initialState,

  setStatus(status: PaymentStatus): void {
    set({ status })
  },

  setMpPaymentId(id: string): void {
    set({ mpPaymentId: id })
  },

  setPagoResult(mp_status: string, mp_payment_id: string | null): void {
    set({
      mp_status,
      mp_payment_id,
      mpPaymentId: mp_payment_id,
      status: mpStatusToInternal(mp_status),
    })
  },

  setDireccionSeleccionada(id: number | null): void {
    set({ direccionSeleccionadaId: id })
  },

  resetPayment(): void {
    set(initialState)
  },

  reset(): void {
    set(initialState)
  },
}))
