import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, SquarePen, Trash2 } from 'lucide-react'
import { deleteBlogPost, fetchBlogCategories, fetchBlogPosts } from '../../api/blog'
import { apiErrorMessage } from '../../api/client'
import { formatDate } from '../../lib/format'
import { StatusBadge } from '../../components/blog/StatusBadge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import type { BlogCategory, BlogPost } from '../../types/api'

const PAGE_SIZE = 8

type StatusFilter = 'all' | 'published' | 'draft'

export function BlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchBlogPosts(), fetchBlogCategories()])
      .then(([postsRes, categoriesRes]) => {
        if (cancelled) return
        setPosts(postsRes)
        setCategories(categoriesRes)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Failed to load blog posts.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c.title])), [categories])

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      if (categoryFilter !== 'all' && post.categoryId !== categoryFilter) return false
      if (statusFilter === 'published' && !post.isPublished) return false
      if (statusFilter === 'draft' && post.isPublished) return false
      return true
    })
  }, [posts, categoryFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length)

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function confirmDelete() {
    if (!postToDelete) return
    setIsDeleting(true)
    try {
      await deleteBlogPost(postToDelete.id)
      setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id))
      setPostToDelete(null)
    } catch (err) {
      alert(apiErrorMessage(err, 'Failed to delete this post.'))
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading blog posts…</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setPage(1)
              }}
              className="appearance-none rounded-md border border-header-border bg-white py-2 pl-3 pr-8 text-xs text-heading focus:border-orange focus:outline-none"
            >
              <option value="all">Category: All Knowledge</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  Category: {category.title}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter)
                setPage(1)
              }}
              className="appearance-none rounded-md border border-header-border bg-white py-2 pl-3 pr-8 text-xs text-heading focus:border-orange focus:outline-none"
            >
              <option value="all">Status: All</option>
              <option value="published">Status: Published</option>
              <option value="draft">Status: Draft</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
        </div>

        <Link
          to="/blog-posts/new"
          className="rounded-lg bg-orange px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          New Blog Post
        </Link>
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-card-border-alt bg-white">
        <div className="flex items-center bg-[#f5ede0] px-6 py-3.5">
          <div className="w-8 shrink-0" />
          <p className="flex-1 text-[11px] font-bold text-muted">TITLE</p>
          <p className="w-[140px] shrink-0 text-[11px] font-bold text-muted">AUTHOR</p>
          <p className="w-40 shrink-0 text-[11px] font-bold text-muted">CATEGORY</p>
          <p className="w-[110px] shrink-0 text-[11px] font-bold text-muted">STATUS</p>
          <p className="w-[120px] shrink-0 text-[11px] font-bold text-muted">DATE</p>
          <p className="w-20 shrink-0 text-[11px] font-bold text-muted">VIEWS</p>
          <p className="w-[100px] shrink-0 text-right text-[11px] font-bold text-muted">ACTIONS</p>
        </div>

        {pageItems.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">No blog posts match these filters.</p>
        ) : (
          pageItems.map((post, i) => (
            <div
              key={post.id}
              className={`flex items-center border-b border-card-border-alt px-6 py-3.5 last:border-b-0 ${
                i % 2 === 1 ? 'bg-search-bg' : 'bg-white'
              }`}
            >
              <div className="flex w-8 shrink-0 items-center justify-center">
                <button
                  type="button"
                  onClick={() => toggleSelected(post.id)}
                  aria-label="Select row"
                  className={`size-4 rounded border-[1.5px] ${
                    selected.has(post.id) ? 'border-orange bg-orange' : 'border-card-border-alt bg-white'
                  }`}
                />
              </div>
              <p className="flex-1 truncate pr-4 text-xs font-semibold text-heading">{post.title}</p>
              <p className="w-[140px] shrink-0 truncate pr-2 text-xs text-body">{post.author}</p>
              <p className="w-40 shrink-0 truncate pr-2 text-xs text-muted">
                {post.categoryId ? (categoryById.get(post.categoryId) ?? '—') : '—'}
              </p>
              <div className="w-[110px] shrink-0">
                <StatusBadge isPublished={post.isPublished} />
              </div>
              <p className="w-[120px] shrink-0 text-xs text-body">
                {formatDate(post.publishedAt ?? post.createdAt)}
              </p>
              <p className="w-20 shrink-0 text-xs text-body">—</p>
              <div className="flex w-[100px] shrink-0 items-center justify-end gap-3">
                <Link to={`/blog-posts/${post.id}/edit`} title="Edit post" className="text-orange hover:text-orange-active">
                  <SquarePen size={18} />
                </Link>
                <button
                  type="button"
                  onClick={() => setPostToDelete(post)}
                  title="Delete post"
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          {filtered.length === 0
            ? 'No posts found'
            : `Showing ${rangeStart}-${rangeEnd} of ${filtered.length} posts`}
        </p>
        {totalPages > 1 && (
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setPage(pageNum)}
                className={`rounded px-2.5 py-1.5 text-[11px] ${
                  pageNum === currentPage
                    ? 'bg-maroon font-semibold text-white'
                    : 'border border-card-border text-heading hover:bg-search-bg'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>
        )}
      </div>

      {postToDelete && (
        <ConfirmDialog
          title="Delete Blog Post?"
          description={`Are you sure you want to delete "${postToDelete.title}"? This action cannot be undone.`}
          isConfirming={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setPostToDelete(null)}
        />
      )}
    </div>
  )
}
