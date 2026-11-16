interface LoaderProps {
  label?: string
  /** Fill the whole viewport (used while the app itself is booting). Otherwise it centers within the page area. */
  fullScreen?: boolean
}

export function Loader({ label = 'Loading…', fullScreen = false }: LoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full flex-col items-center justify-center gap-4 ${fullScreen ? 'min-h-svh bg-page' : 'min-h-[60vh]'}`}
    >
      <div className="relative size-12">
        <div className="absolute inset-0 rounded-full border-4 border-orange/15" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-orange" />
      </div>
      <p className="font-display text-base font-semibold text-maroon">{label}</p>
    </div>
  )
}
