export default function Loading() {
  return (
    <div className="w-full animate-pulse space-y-6 p-1">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-md bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-64 rounded-md bg-gray-100 dark:bg-gray-700/60" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="h-7 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>

      {/* Content rows skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
          <div className="h-5 w-36 rounded bg-gray-200 dark:bg-gray-700" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3 w-1/2 rounded bg-gray-50 dark:bg-gray-800/60" />
              </div>
              <div className="h-4 w-16 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
          <div className="h-5 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-3.5 w-24 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-3.5 w-10 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-gray-200 dark:bg-gray-700"
                  style={{ width: `${40 + i * 12}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
