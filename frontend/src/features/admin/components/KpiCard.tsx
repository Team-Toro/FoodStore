interface KpiCardProps {
  title: string
  value: string | number | null | undefined
  loading?: boolean
  prefix?: string
  suffix?: string
}

export function KpiCard({ title, value, loading = false, prefix = '', suffix = '' }: KpiCardProps): JSX.Element {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      {loading ? (
        <div className="animate-pulse h-8 bg-gray-200 rounded w-24 mt-1" />
      ) : (
        <p className="text-2xl font-bold text-gray-900">
          {prefix}
          {value !== null && value !== undefined ? value : '—'}
          {suffix}
        </p>
      )}
    </div>
  )
}
