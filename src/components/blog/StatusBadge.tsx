export function StatusBadge({ isPublished }: { isPublished: boolean }) {
  return isPublished ? (
    <span className="inline-flex items-center rounded-md bg-[#e3f2fd] px-2 py-1 text-[11px] font-semibold text-success">
      Published
    </span>
  ) : (
    <span className="inline-flex items-center rounded-md bg-[#fff9e6] px-2 py-1 text-[11px] font-semibold text-[#d39e00]">
      Draft
    </span>
  )
}
