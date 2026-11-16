import { Trash2 } from 'lucide-react'

interface DeleteUserDialogProps {
  userName: string
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteUserDialog({ userName, isDeleting, onConfirm, onCancel }: DeleteUserDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#fdf2f2]">
            <Trash2 size={20} className="text-[#ef4444]" />
          </div>
          <p className="font-display text-xl font-bold text-maroon">Delete User?</p>
        </div>

        <p className="text-sm leading-relaxed text-heading">
          Are you sure you want to delete user &quot;{userName}&quot;? All their content and activity history will be permanently
          removed. This action cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-header-border bg-white px-5 py-2.5 text-[13px] font-semibold text-heading transition-colors hover:bg-search-bg disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-lg bg-[#ef4444] px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isDeleting ? 'Deleting…' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  )
}
