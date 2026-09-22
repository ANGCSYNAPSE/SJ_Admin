import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ tags, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('')

  function commitDraft() {
    const value = draft.trim()
    if (value && !tags.includes(value)) {
      onChange([...tags, value])
    }
    setDraft('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitDraft()
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-card-border bg-white px-3.5 py-2.5 focus-within:border-orange">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-md bg-orange/10 px-2 py-1 text-xs font-medium text-orange"
        >
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} aria-label={`Remove ${tag}`}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="min-w-[120px] flex-1 bg-transparent text-sm text-heading placeholder:text-muted focus:outline-none"
      />
    </div>
  )
}
