import { Trash2, type LucideIcon } from 'lucide-react'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  icon?: LucideIcon
  isConfirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  icon: Icon = Trash2,
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="flex size-14 items-center justify-center rounded-full bg-red-100">
          <Icon size={24} className="text-red-600" />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-lg font-bold text-heading">{title}</p>
          <p className="text-sm text-body">{description}</p>
        </div>
        <div className="mt-1 flex w-full items-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isConfirming ? 'Deleting…' : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="flex-1 rounded-lg border border-header-border bg-white px-4 py-2.5 text-sm font-semibold text-heading transition-colors hover:bg-search-bg disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
