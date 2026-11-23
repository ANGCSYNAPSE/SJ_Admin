import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { resolveUploadUrl } from '../../api/client'
import type { AdSlot, AdTemplate, AdTheme } from '../../types/api'

/** The real pixel size each slot has on the website. */
export const SLOT_DIMS: Record<AdSlot, { w: number; h: number }> = {
  leaderboard: { w: 728, h: 90 },
  banner: { w: 970, h: 250 },
  rectangle: { w: 300, h: 250 },
}

export const THEME_COLOURS: Record<Exclude<AdTheme, 'custom'>, [string, string]> = {
  maroon: ['#7a1f1f', '#4a1010'],
  navy: ['#12305a', '#0a1b36'],
  charcoal: ['#2e2e2e', '#121212'],
  forest: ['#1d5c3a', '#0d3320'],
  royal: ['#4b2a8a', '#2a1458'],
  teal: ['#0f6b6b', '#083f45'],
}

export const THEME_LABELS: Record<Exclude<AdTheme, 'custom'>, string> = {
  maroon: 'Maroon',
  navy: 'Navy',
  charcoal: 'Charcoal',
  forest: 'Forest',
  royal: 'Royal purple',
  teal: 'Teal',
}

/** The button colour each scheme uses when the ad does not pick its own (the website uses the same table). */
export const THEME_BUTTON: Record<Exclude<AdTheme, 'custom'>, string> = {
  maroon: '#e8751a',
  navy: '#f08a24',
  charcoal: '#e8751a',
  forest: '#f2b441',
  royal: '#e0457b',
  teal: '#f2b441',
}

export function defaultButtonColour(theme: AdTheme): string {
  return theme === 'custom' ? '#e8751a' : THEME_BUTTON[theme]
}

/** Button colour and a text colour that stays readable on it (dark on light buttons, white on dark ones). */
export function buttonColours(theme: AdTheme, ctaColor: string): { bg: string; fg: string } {
  const bg = /^#[0-9a-f]{6}$/i.test(ctaColor) ? ctaColor : defaultButtonColour(theme)
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return { bg, fg: 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? '#1a1209' : '#ffffff' }
}

export interface AdPreviewData {
  template: AdTemplate
  imageUrl: string | null
  headline: string
  subline: string
  ctaLabel: string
  hasLink: boolean
  theme: AdTheme
  bgFrom: string
  bgTo: string
  /** Empty = the scheme's default. */
  ctaColor: string
}

export function themeColours(theme: AdTheme, bgFrom: string, bgTo: string): [string, string] {
  if (theme === 'custom' && /^#[0-9a-f]{6}$/i.test(bgFrom) && /^#[0-9a-f]{6}$/i.test(bgTo)) return [bgFrom, bgTo]
  return THEME_COLOURS[theme === 'custom' ? 'maroon' : theme]
}

// Mirrors the website's own drawing of an ad (the same sizes, spacing and colours).
const LOOK = {
  leaderboard: { pad: 22, head: 21, sub: 12.5, subTop: 3, cta: 12, ctaPad: '7px 16px', imageW: 190, gap: 18 },
  banner: { pad: 52, head: 40, sub: 19, subTop: 8, cta: 16, ctaPad: '13px 30px', imageW: 430, gap: 28 },
  rectangle: { pad: 20, head: 21, sub: 13, subTop: 5, cta: 12.5, ctaPad: '8px 18px', imageW: 0, gap: 0 },
} as const

function Creative({ ad, size }: { ad: AdPreviewData; size: AdSlot }) {
  const { w, h } = SLOT_DIMS[size]
  const src = resolveUploadUrl(ad.imageUrl)

  if (ad.template === 'image') {
    return src ? (
      <img src={src} alt="" style={{ width: w, height: h, objectFit: 'cover', display: 'block' }} />
    ) : (
      <div style={{ width: w, height: h, background: '#ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9e9e9e', fontSize: 14 }}>
        Upload the picture
      </div>
    )
  }

  const look = LOOK[size]
  const [from, to] = themeColours(ad.theme, ad.bgFrom, ad.bgTo)
  const stacked = size === 'rectangle'
  const cta = ad.ctaLabel.trim() || (ad.hasLink ? 'Learn more' : '')
  const tone = buttonColours(ad.theme, ad.ctaColor)

  const picture: CSSProperties = stacked
    ? { position: 'absolute', left: 0, right: 0, top: 0, height: 118, WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)', maskImage: 'linear-gradient(to bottom, #000 55%, transparent)' }
    : { position: 'absolute', right: 0, top: 0, bottom: 0, width: look.imageW, WebkitMaskImage: 'linear-gradient(to right, transparent, #000 38%)', maskImage: 'linear-gradient(to right, transparent, #000 38%)' }

  const textBox: CSSProperties = stacked
    ? { position: 'absolute', left: look.pad, right: look.pad, bottom: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }
    : { position: 'absolute', left: look.pad, top: 0, bottom: 0, right: src ? look.imageW * 0.62 : look.pad, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: look.gap }

  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', background: `linear-gradient(100deg, ${from}, ${to})`, color: '#fff' }}>
      {src && <img src={src} alt="" style={{ ...picture, objectFit: 'cover', display: 'block' }} />}
      <div style={textBox}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: look.head, lineHeight: 1.15, letterSpacing: '-0.2px', textShadow: '0 1px 6px rgba(0,0,0,.25)' }}>
            {ad.headline || 'Your headline appears here'}
          </p>
          {ad.subline && <p style={{ margin: 0, marginTop: look.subTop, fontSize: look.sub, lineHeight: 1.25, color: '#f4d9b0' }}>{ad.subline}</p>}
        </div>
        {cta && (
          <span style={{ flexShrink: 0, background: tone.bg, color: tone.fg, fontWeight: 700, fontSize: look.cta, padding: look.ctaPad, borderRadius: 999, whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,.25)', marginTop: stacked ? 10 : 0 }}>
            {cta} ›
          </span>
        )}
      </div>
    </div>
  )
}

/** How the ad will look on the website, drawn at its real size and shrunk to fit the space it is given. */
export function AdPreview({ ad, size }: { ad: AdPreviewData; size: AdSlot }) {
  const { w, h } = SLOT_DIMS[size]
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setScale(Math.min(1, el.clientWidth / w))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [w])

  return (
    <div ref={ref} style={{ width: '100%', maxWidth: w }}>
      <div style={{ position: 'relative', overflow: 'hidden', height: h * scale, borderRadius: 4, border: '1px solid #e0e0e0' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          <Creative ad={ad} size={size} />
        </div>
      </div>
    </div>
  )
}
