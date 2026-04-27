import { useForm } from '@tanstack/react-form'
import { useNavigate, Link } from 'react-router-dom'
import { useRegister } from '../hooks/useRegister'
import type { AxiosError } from 'axios'

interface ApiError {
  code?: string
  detail?: string
}

export function RegisterPage(): JSX.Element {
  const navigate = useNavigate()
  const registerMutation = useRegister()

  const form = useForm({
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      const { confirmPassword, ...data } = value
      await registerMutation.mutateAsync(data)
      navigate('/')
    },
  })

  const apiError = registerMutation.error as AxiosError<ApiError> | null
  const errorCode = apiError?.response?.data?.code

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Crear cuenta
          </h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="mt-8 space-y-4"
        >
          {/* Nombre */}
          <form.Field
            name="nombre"
            validators={{
              onChange: ({ value }) =>
                !value ? 'El nombre es requerido' :
                value.trim().length < 2 ? 'Mínimo 2 caracteres' :
                value.trim().length > 80 ? 'Máximo 80 caracteres' : undefined,
            }}
          >
            {(field) => (
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  id="nombre"
                  type="text"
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

          {/* Apellido */}
          <form.Field
            name="apellido"
            validators={{
              onChange: ({ value }) =>
                !value ? 'El apellido es requerido' :
                value.trim().length < 2 ? 'Mínimo 2 caracteres' :
                value.trim().length > 80 ? 'Máximo 80 caracteres' : undefined,
            }}
          >
            {(field) => (
              <div>
                <label htmlFor="apellido" className="block text-sm font-medium text-gray-700">Apellido</label>
                <input
                  id="apellido"
                  type="text"
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

          {/* Email */}
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
                <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  id="reg-email"
                  type="email"
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

          {/* Password */}
          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) =>
                !value ? 'La contraseña es requerida' :
                value.length < 8 ? 'Mínimo 8 caracteres' : undefined,
            }}
          >
            {(field) => (
              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700">Contraseña</label>
                <input
                  id="reg-password"
                  type="password"
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

          {/* Confirm Password */}
          <form.Field
            name="confirmPassword"
            validators={{
              onChangeListenTo: ['password'],
              onChange: ({ value, fieldApi }) => {
                const password = fieldApi.form.getFieldValue('password')
                return !value ? 'Confirmá la contraseña' :
                  value !== password ? 'Las contraseñas no coinciden' : undefined
              },
            }}
          >
            {(field) => (
              <div>
                <label htmlFor="reg-confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar contraseña
                </label>
                <input
                  id="reg-confirmPassword"
                  type="password"
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

          {/* API errors */}
          {registerMutation.isError && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {errorCode === 'EMAIL_ALREADY_EXISTS'
                  ? 'Este email ya está registrado. Intentá con otro email o iniciá sesión.'
                  : apiError?.response?.data?.detail ?? 'Error al registrarse. Intenta nuevamente.'}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {registerMutation.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          <p className="text-center text-sm text-gray-600">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-indigo-600 hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
