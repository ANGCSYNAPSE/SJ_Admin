import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchPendingCounts, type PendingCounts } from '../../api/pending'

/** Fires this on `window` after an approval or a rejection, so the badges on the menu update at once. */
export const PENDING_CHANGED = 'admin:pending-changed' // the same name is used in api/client.ts

const EVERY = 45_000

/**
 * The numbers on the menu's badges: what is still waiting for an admin. They come from the API, and are read again when the
 * admin moves to another page, when the tab comes back into view, when something was approved or rejected (PENDING_CHANGED),
 * and every 45 seconds, so a new registration shows up without a reload. A failed read keeps the numbers already shown.
 */
export function usePendingCounts(): PendingCounts | null {
  const [counts, setCounts] = useState<PendingCounts | null>(null)
  const { pathname } = useLocation()

  const load = useCallback(() => {
    fetchPendingCounts()
      .then(setCounts)
      .catch(() => {
        /* keep what is on screen */
      })
  }, [])

  useEffect(() => {
    load()
  }, [load, pathname])

  useEffect(() => {
    const timer = window.setInterval(load, EVERY)
    const onVisible = () => document.visibilityState === 'visible' && load()
    window.addEventListener(PENDING_CHANGED, load)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener(PENDING_CHANGED, load)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  return counts
}
