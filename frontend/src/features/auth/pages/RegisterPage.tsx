// redesigned in us-009
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Clock, Truck, Star } from 'lucide-react'
import { useRegister } from '../hooks/useRegister'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'
import { Label } from '../../../shared/ui/Label'
import { FieldError } from '../../../shared/ui/FieldError'
import { Badge } from '../../../shared/ui/Badge'
import { Card, CardBody } from '../../../shared/ui/Card'
import { cn } from '../../../shared/lib/cn'
import type { AxiosError } from 'axios'

interface ApiError {
  code?: string
  detail?: string
}

/* ── Password strength ── */
type StrengthLevel = 'weak' | 'medium' | 'strong'

function getPasswordStrength(password: string): StrengthLevel | null {
  if (!password) return null
  const hasLength = password.length >= 8
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)
  if (hasLength && hasNumber && hasSpecial) return 'strong'
  if (hasLength && hasNumber) return 'medium'
  return 'weak'
}

const STRENGTH_CONFIG: Record<
  StrengthLevel,
  { label: string; badgeVariant: 'danger' | 'warning' | 'success'; barClass: string; fill: number }
> = {
  weak:   { label: 'Débil',  badgeVariant: 'danger',  barClass: 'bg-danger',   fill: 1 },
  medium: { label: 'Media',  badgeVariant: 'warning', barClass: 'bg-warning',  fill: 2 },
  strong: { label: 'Fuerte', badgeVariant: 'success', barClass: 'bg-success',  fill: 3 },
}

/* ── Brand panel features ── */
const FEATURES = [
  { icon: Clock, text: 'Entrega en menos de 30 minutos' },
  { icon: Truck, text: 'Seguí tu pedido en tiempo real' },
  { icon: Star,  text: 'Los mejores restaurantes de la ciudad' },
]

export function RegisterPage(): JSX.Element {
  const navigate = useNavigate()
  const registerMutation = useRegister()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm({
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      const { confirmPassword: _cp, ...data } = value
      await registerMutation.mutateAsync(data)
      navigate('/')
    },
  })

  const apiError = registerMutation.error as AxiosError<ApiError> | null
  const errorCode = apiError?.response?.data?.code
  const errorDetail = apiError?.response?.data?.detail

  const inlineError = registerMutation.isError
    ? errorCode === 'EMAIL_ALREADY_EXISTS'
      ? 'Este email ya está registrado. Intentá con otro email o iniciá sesión.'
      : errorDetail ?? 'Error al registrarse. Intenta nuevamente.'
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
            Crear cuenta
          </h1>
          <p className="mb-8 text-sm text-fg-muted">
            ¿Ya tenés cuenta?{' '}
            <Link
              to="/login"
              className="font-medium text-brand-500 hover:text-brand-600 focus-visible:underline"
            >
              Iniciá sesión
            </Link>
          </p>

          <Card variant="elevated">
            <CardBody className="px-6 py-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
                noValidate
              >
                <div className="space-y-4">
                  {/* ── Nombre ── */}
                  <form.Field
                    name="nombre"
                    validators={{
                      onChange: ({ value }) =>
                        !value
                          ? 'El nombre es requerido'
                          : value.trim().length < 2
                          ? 'Mínimo 2 caracteres'
                          : value.trim().length > 80
                          ? 'Máximo 80 caracteres'
                          : undefined,
                    }}
                  >
                    {(field) => {
                      const fieldErrorId = `${field.name}-error`
                      const hasError = field.state.meta.errors.length > 0
                      return (
                        <div>
                          <Label htmlFor="nombre">
                            Nombre
                          </Label>
                          <Input
                            id="nombre"
                            type="text"
                            autoComplete="given-name"
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

                  {/* ── Apellido ── */}
                  <form.Field
                    name="apellido"
                    validators={{
                      onChange: ({ value }) =>
                        !value
                          ? 'El apellido es requerido'
                          : value.trim().length < 2
                          ? 'Mínimo 2 caracteres'
                          : value.trim().length > 80
                          ? 'Máximo 80 caracteres'
                          : undefined,
                    }}
                  >
                    {(field) => {
                      const fieldErrorId = `${field.name}-error`
                      const hasError = field.state.meta.errors.length > 0
                      return (
                        <div>
                          <Label htmlFor="apellido">
                            Apellido
                          </Label>
                          <Input
                            id="apellido"
                            type="text"
                            autoComplete="family-name"
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
                          <Label htmlFor="reg-email">
                            Email
                          </Label>
                          <Input
                            id="reg-email"
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

                  {/* ── Password + strength indicator ── */}
                  <form.Field
                    name="password"
                    validators={{
                      onChange: ({ value }) =>
                        !value
                          ? 'La contraseña es requerida'
                          : value.length < 8
                          ? 'Mínimo 8 caracteres'
                          : undefined,
                    }}
                  >
                    {(field) => {
                      const fieldErrorId = `${field.name}-error`
                      const hasError = field.state.meta.errors.length > 0
                      const strength = getPasswordStrength(field.state.value)
                      const cfg = strength ? STRENGTH_CONFIG[strength] : null

                      return (
                        <div>
                          <Label htmlFor="reg-password">
                            Contraseña
                          </Label>
                          <div className="relative">
                            <Input
                              id="reg-password"
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="new-password"
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

                          {/* Strength meter */}
                          {field.state.value && (
                            <div className="mt-2">
                              <div className="flex gap-1 mb-1.5" aria-hidden="true">
                                {([1, 2, 3] as const).map((seg) => (
                                  <div
                                    key={seg}
                                    className={cn(
                                      'h-1 flex-1 rounded-full transition-all duration-300',
                                      cfg && seg <= cfg.fill
                                        ? cfg.barClass
                                        : 'bg-border'
                                    )}
                                  />
                                ))}
                              </div>
                              {cfg && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-fg-muted">Seguridad:</span>
                                  <Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
                                </div>
                              )}
                            </div>
                          )}

                          <FieldError id={fieldErrorId}>
                            {field.state.meta.errors[0]}
                          </FieldError>
                        </div>
                      )
                    }}
                  </form.Field>

                  {/* ── Confirm password ── */}
                  <form.Field
                    name="confirmPassword"
                    validators={{
                      onChangeListenTo: ['password'],
                      onChange: ({ value, fieldApi }) => {
                        const password = fieldApi.form.getFieldValue('password')
                        return !value
                          ? 'Confirmá la contraseña'
                          : value !== password
                          ? 'Las contraseñas no coinciden'
                          : undefined
                      },
                    }}
                  >
                    {(field) => {
                      const fieldErrorId = `${field.name}-error`
                      const hasError = field.state.meta.errors.length > 0
                      return (
                        <div>
                          <Label htmlFor="reg-confirmPassword">
                            Confirmar contraseña
                          </Label>
                          <div className="relative">
                            <Input
                              id="reg-confirmPassword"
                              type={showConfirm ? 'text' : 'password'}
                              autoComplete="new-password"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              invalid={hasError}
                              describedBy={hasError ? fieldErrorId : undefined}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
                              onClick={() => setShowConfirm((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-sm"
                            >
                              {showConfirm ? (
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
                        loading={isSubmitting || registerMutation.isPending}
                        loadingLabel="Creando cuenta…"
                        className="mt-2 w-full"
                      >
                        Crear cuenta
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
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm text-4xl shadow-lg">
            🍽
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
