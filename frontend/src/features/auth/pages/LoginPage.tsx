// redesigned in us-009
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Clock, Truck, Star, UtensilsCrossed } from 'lucide-react'
import { useLogin } from '../hooks/useLogin'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'
import { Label } from '../../../shared/ui/Label'
import { FieldError } from '../../../shared/ui/FieldError'
import { Card, CardBody } from '../../../shared/ui/Card'
import type { AxiosError } from 'axios'

interface ApiError {
  code?: string
  detail?: string
}

/* ── Brand panel feature highlights ── */
const FEATURES = [
  { icon: Clock,  text: 'Entrega en menos de 30 minutos' },
  { icon: Truck,  text: 'Seguí tu pedido en tiempo real' },
  { icon: Star,   text: 'Los mejores restaurantes de la ciudad' },
]

export function LoginPage(): JSX.Element {
  const navigate = useNavigate()
  const loginMutation = useLogin()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      await loginMutation.mutateAsync(value)
      navigate('/')
    },
  })

  const apiError = loginMutation.error as AxiosError<ApiError> | null
  const errorCode = apiError?.response?.data?.code
  const errorDetail = apiError?.response?.data?.detail

  /* Derive inline message — INVALID_CREDENTIALS and RATE_LIMIT_EXCEEDED stay inline */
  const inlineError = loginMutation.isError
    ? errorCode === 'INVALID_CREDENTIALS'
      ? 'Email o contraseña incorrectos.'
      : errorCode === 'RATE_LIMIT_EXCEEDED'
      ? `Demasiados intentos. ${errorDetail ?? 'Intenta de nuevo más tarde.'}`
      : errorDetail ?? 'Error al iniciar sesión. Intenta nuevamente.'
    : null

  return (
    <div className="min-h-screen flex">
      {/* ── Left — form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-bg px-6 py-12 md:px-12">
        {/* Mobile brand mark */}
        <div className="mb-8 flex flex-col items-center md:hidden">
          <span className="text-3xl font-extrabold tracking-tight text-brand-500">
            🍽 Food Store
          </span>
          <p className="mt-1 text-sm text-fg-muted">Comida rica, entrega rápida</p>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-fg">
            Iniciar sesión
          </h1>
          <p className="mb-8 text-sm text-fg-muted">
            ¿No tenés cuenta?{' '}
            <Link
              to="/register"
              className="font-medium text-brand-500 hover:text-brand-600 focus-visible:underline"
            >
              Registrate gratis
            </Link>
          </p>

          <Card variant="elevated">
            <CardBody className="px-6 py-6 space-y-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
                noValidate
              >
                <div className="space-y-4">
                  {/* ── Email ── */}
                  <form.Field
                    name="email"
                    validators={{
                      onChange: ({ value }) =>
                        !value
                          ? 'El email es requerido'
                          : !/\S+@\S+\.\S+/.test(value)
                          ? 'Email inválido'
                          : undefined,
                    }}
                  >
                    {(field) => {
                      const fieldErrorId = `${field.name}-error`
                      const hasError = field.state.meta.errors.length > 0
                      return (
                        <div>
                          <Label htmlFor="email">
                            Email
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            invalid={hasError}
                            describedBy={hasError ? fieldErrorId : undefined}
                          />
                          <FieldError id={fieldErrorId}>
                            {field.state.meta.errors[0]}
                          </FieldError>
                        </div>
                      )
                    }}
                  </form.Field>

                  {/* ── Password ── */}
                  <form.Field
                    name="password"
                    validators={{
                      onChange: ({ value }) =>
                        !value
                          ? 'La contraseña es requerida'
                          : value.length < 8
                          ? 'La contraseña debe tener al menos 8 caracteres'
                          : undefined,
                    }}
                  >
                    {(field) => {
                      const fieldErrorId = `${field.name}-error`
                      const hasError = field.state.meta.errors.length > 0
                      return (
                        <div>
                          <Label htmlFor="password">
                            Contraseña
                          </Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="current-password"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              invalid={hasError}
                              describedBy={hasError ? fieldErrorId : undefined}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-sm"
                            >
                              {showPassword ? (
                                <EyeOff size={16} aria-hidden="true" />
                              ) : (
                                <Eye size={16} aria-hidden="true" />
                              )}
                            </button>
                          </div>
                          <FieldError id={fieldErrorId}>
                            {field.state.meta.errors[0]}
                          </FieldError>
                        </div>
                      )
                    }}
                  </form.Field>

                  {/* ── API / server error ── */}
                  {inlineError && (
                    <FieldError role="alert">{inlineError}</FieldError>
                  )}

                  {/* ── Submit ── */}
                  <form.Subscribe selector={(state) => state.isSubmitting}>
                    {(isSubmitting) => (
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={isSubmitting || loginMutation.isPending}
                        loadingLabel="Iniciando sesión…"
                        className="mt-2 w-full"
                      >
                        Iniciar sesión
                      </Button>
                    )}
                  </form.Subscribe>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ── Right — brand panel (md+) ── */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-brand-500 px-12 py-16 text-white">
        {/* Logo / brand mark */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
            <UtensilsCrossed className="h-12 w-12 text-white" aria-hidden="true" />
          </div>
          <span className="text-4xl font-extrabold tracking-tight">Food Store</span>
        </div>

        <p className="mb-10 text-center text-xl font-medium leading-snug text-white/90">
          Comida rica,
          <br />
          entrega rápida
        </p>

        {/* Feature list */}
        <ul className="space-y-4">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-white/85">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="text-sm font-medium">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
