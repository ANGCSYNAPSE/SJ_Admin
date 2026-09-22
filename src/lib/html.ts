/** Strips HTML tags to build a plain-text excerpt from rich-text content. */
export function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function excerptFromHtml(html: string, maxLength = 160): string {
  const text = stripHtml(html)
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trimEnd()}…`
}
