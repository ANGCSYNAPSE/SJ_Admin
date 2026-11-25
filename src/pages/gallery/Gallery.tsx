import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { fetchGalleryItems, reviewGalleryItem, type GalleryItem, type GalleryList, type GalleryStatus } from '../../api/gallery'
import { apiErrorMessage, resolveUploadUrl } from '../../api/client'
import { formatDate } from '../../lib/format'
import { Loader } from '../../components/ui/Loader'
import { useToast } from '../../components/ui/Toast'

const TABS: { key: GalleryStatus; label: string }[] = [
  { key: 'pending', label: 'Waiting for approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Not approved' },
]

const galleryName = (item: GalleryItem) => (item.gallery === 'own-wish' ? 'Seva of Own Wish' : `Initiatives: ${item.folder}`)

/**
 * The photographs and videos members share for the website's galleries. Each one waits here; nothing is shown to the public
 * until it is approved, and an approved one can be taken down again by marking it "not approved".
 */
export function Gallery() {
  const toast = useToast()
  const [status, setStatus] = useState<GalleryStatus>('pending')
  const [data, setData] = useState<GalleryList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchGalleryItems(status)
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError(null)
      })
      .catch((e) => !cancelled && setError(apiErrorMessage(e, 'Could not load the gallery items.')))
    return () => {
      cancelled = true
    }
  }, [status, reload])

  const refresh = useCallback(() => setReload((n) => n + 1), [])

  async function review(item: GalleryItem, next: GalleryStatus) {
    setBusy(item.id)
    try {
      await reviewGalleryItem(item.id, next)
      toast.success(next === 'approved' ? 'Approved. It is now in the gallery.' : 'Saved. It is not shown.')
      refresh()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save.'))
    } finally {
      setBusy(null)
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return <Loader />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatus(t.key)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${status === t.key ? 'bg-orange-active text-white' : 'border border-card-border-alt bg-white text-body hover:bg-black/5'}`}
          >
            {t.label} <span className="ml-1 opacity-80">({data.counts[t.key] ?? 0})</span>
          </button>
        ))}
      </div>

      {data.items.length === 0 ? (
        <p className="rounded-xl border border-card-border-alt bg-white p-8 text-center text-sm text-muted">
          {status === 'pending' ? 'Nothing is waiting for approval.' : 'Nothing here.'}
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((item) => {
            const src = resolveUploadUrl(item.url) ?? item.url
            return (
              <li key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-card-border-alt bg-white">
                <div className="aspect-video bg-black/5">
                  {item.kind === 'video' ? (
                    <video src={src} controls preload="metadata" className="size-full object-contain" />
                  ) : (
                    <img src={src} alt={item.caption ?? 'Shared photo'} className="size-full object-cover" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-orange">{galleryName(item)}</p>
                  {item.caption && <p className="text-sm text-body">{item.caption}</p>}
                  <p className="text-xs text-muted">
                    {item.fullName} · {item.email} · {formatDate(item.createdAt)}
                  </p>
                  <div className="mt-auto flex gap-2 pt-2">
                    {item.status !== 'approved' && (
                      <button type="button" disabled={busy === item.id} onClick={() => review(item, 'approved')} className="flex items-center gap-1.5 rounded-lg bg-[#1e7e34] px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
                        {busy === item.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve
                      </button>
                    )}
                    {item.status !== 'rejected' && (
                      <button type="button" disabled={busy === item.id} onClick={() => review(item, 'rejected')} className="flex items-center gap-1.5 rounded-lg border border-[#c0392b] px-3.5 py-2 text-[13px] font-semibold text-[#c0392b] disabled:opacity-60">
                        <XCircle size={14} /> {item.status === 'approved' ? 'Take down' : 'Reject'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
