import { useForm } from '@tanstack/react-form'
import { useNavigate, Link } from 'react-router-dom'
import { useLogin } from '../hooks/useLogin'
import type { AxiosError } from 'axios'

interface ApiError {
  code?: string
  detail?: string
}

export function LoginPage(): JSX.Element {
  const navigate = useNavigate()
  const loginMutation = useLogin()

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar sesión
          </h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="mt-8 space-y-6"
        >
          {/* Email */}
          <div>
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) =>
                  !value ? 'El email es requerido' :
                  !/\S+@\S+\.\S+/.test(value) ? 'Email inválido' : undefined,
              }}
            >
              {(field) => (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="mt-1 text-sm text-red-600">{field.state.meta.errors[0]}</p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          {/* Password */}
          <div>
            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) =>
                  !value ? 'La contraseña es requerida' :
                  value.length < 8 ? 'La contraseña debe tener al menos 8 caracteres' : undefined,
              }}
            >
              {(field) => (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="mt-1 text-sm text-red-600">{field.state.meta.errors[0]}</p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          {/* API errors */}
          {loginMutation.isError && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {errorCode === 'INVALID_CREDENTIALS'
                  ? 'Email o contraseña incorrectos.'
                  : errorCode === 'RATE_LIMIT_EXCEEDED'
                  ? `Demasiados intentos. ${errorDetail ?? 'Intenta de nuevo más tarde.'}`
                  : errorDetail ?? 'Error al iniciar sesión. Intenta nuevamente.'}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loginMutation.isPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>

          <p className="text-center text-sm text-gray-600">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-indigo-600 hover:underline">
              Registrate
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
