import { useEffect, useState } from 'react'
import { Download, Loader2, X } from 'lucide-react'
import { saveBlob } from '../../api/documents'

/** Shows a PDF (receipt or invoice) in place, with a Download button. */
export function DocumentPreview({ title, fileName, load, onClose }: { title: string; fileName: string; load: () => Promise<Blob>; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    load()
      .then((b) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(b)
        setBlob(b)
        setUrl(objectUrl)
      })
      .catch(() => !cancelled && setError('Could not open this document. Only payments that were received have one.'))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      cancelled = true
      document.removeEventListener('keydown', onKey)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-card-border-alt px-5 py-3">
          <p className="font-display text-lg font-bold text-maroon">{title}</p>
          <div className="flex items-center gap-2">
            {blob && (
              <button type="button" onClick={() => saveBlob(blob, fileName)} className="inline-flex items-center gap-1.5 rounded-lg bg-orange px-3.5 py-2 text-sm font-semibold text-white">
                <Download size={15} /> Download PDF
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-heading">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="relative flex-1 bg-[#f1ece4]">
          {!url && !error && (
            <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-body">
              <Loader2 size={15} className="animate-spin" /> Preparing the document…
            </p>
          )}
          {error && <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-red-700">{error}</p>}
          {url && <iframe title={title} src={url} className="h-full w-full border-0" />}
        </div>
      </div>
    </div>
  )
}

/** The two small buttons that open a document: preview, or download straight away. */
export function DocumentButtons({
  label,
  onPreview,
  onDownload,
}: {
  label: string
  onPreview: () => void
  onDownload: () => void
}) {
  const cls = 'inline-flex items-center gap-1 rounded-md border border-card-border-alt px-2 py-1 text-[11px] font-semibold text-heading hover:bg-search-bg'
  return (
    <span className="inline-flex gap-1.5">
      <button type="button" onClick={onPreview} className={cls} title={`Preview the ${label.toLowerCase()}`}>
        {label}
      </button>
      <button type="button" onClick={onDownload} className={cls} title={`Download the ${label.toLowerCase()} as a PDF`} aria-label={`Download ${label} PDF`}>
        <Download size={11} /> PDF
      </button>
    </span>
  )
}
