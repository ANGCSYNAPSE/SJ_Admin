import { useEffect, useState } from 'react'
import { Check, Loader2, Timer } from 'lucide-react'
import { fetchAdRotation, saveAdRotation } from '../../api/ads'
import { apiErrorMessage } from '../../api/client'
import type { AdRotation } from '../../types/api'

const inputClass =
  'rounded-lg border border-card-border-alt bg-white px-3 py-2 text-[13px] text-heading focus:border-orange focus:outline-none'

type Unit = 'seconds' | 'minutes'

/** Whole minutes are shown as minutes ("2 minutes"), everything else in seconds. */
function split(seconds: number): { amount: number; unit: Unit } {
  return seconds >= 60 && seconds % 60 === 0 ? { amount: seconds / 60, unit: 'minutes' } : { amount: seconds, unit: 'seconds' }
}

/**
 * How the ad slots on the website rotate: how long each ad stays, and whether the next one fades or slides in.
 * It is one setting for the whole site; every ad slot that has more than one ad to show follows it.
 */
export function RotationSettings() {
  const [rules, setRules] = useState<AdRotation | null>(null)
  const [amount, setAmount] = useState(6)
  const [unit, setUnit] = useState<Unit>('seconds')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchAdRotation()
      .then((r) => {
        if (cancelled) return
        setRules(r)
        const s = split(r.seconds)
        setAmount(s.amount)
        setUnit(s.unit)
      })
      .catch((err) => !cancelled && setError(`Could not load the rotation settings (${apiErrorMessage(err, 'no answer')}). The backend needs the latest version deployed for this card to work.`))
    return () => {
      cancelled = true
    }
  }, [])

  async function save() {
    if (!rules) return
    setError(null)
    const seconds = Math.round(amount * (unit === 'minutes' ? 60 : 1))
    if (!Number.isFinite(seconds) || seconds < 3) return setError('Each ad must stay for at least 3 seconds.')
    if (seconds > 600) return setError('Each ad can stay for 10 minutes at most.')
    setSaving(true)
    try {
      const next = await saveAdRotation({ ...rules, seconds })
      setRules(next)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the rotation settings.'))
    } finally {
      setSaving(false)
    }
  }

  if (!rules) return error ? <p className="text-sm text-red-600">{error}</p> : null

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-card-border-alt bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange/10">
          <Timer size={16} className="text-orange" />
        </div>
        <div>
          <p className="text-sm font-bold text-heading">Ad rotation</p>
          <p className="text-xs text-muted">When a spot on the website has more than one ad, they take turns. This is how.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-[13px] text-body">
          Change the ad every
          <input
            type="number"
            min={1}
            max={600}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className={`${inputClass} w-20`}
            aria-label="Time each ad stays"
          />
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className={inputClass} aria-label="Unit of time">
            <option value="seconds">seconds</option>
            <option value="minutes">minutes</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-[13px] text-body">
          Show ads as
          <select value={rules.transition} onChange={(e) => setRules({ ...rules, transition: e.target.value as AdRotation['transition'] })} className={inputClass}>
            <option value="tiles">tiles (the next and previous peek in at the sides)</option>
            <option value="fade">one ad at a time (fades)</option>
          </select>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-body">
          <input type="checkbox" checked={rules.pauseOnHover} onChange={(e) => setRules({ ...rules, pauseOnHover: e.target.checked })} className="size-4 accent-orange" />
          Stop while the visitor points at it
        </label>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="ml-auto flex items-center gap-2 rounded-lg bg-orange px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
