import { useEffect, useState, type DragEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, Loader2, UploadCloud, X } from 'lucide-react'
import { createBlogPost, fetchBlogCategories, fetchBlogPost, updateBlogPost, type BlogPostInput } from '../../api/blog'
import { uploadFile } from '../../api/uploads'
import { apiErrorMessage, resolveUploadUrl } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { slugify } from '../../lib/slug'
import { excerptFromHtml, stripHtml } from '../../lib/html'
import { RichTextEditor } from '../../components/ui/RichTextEditor'
import { TagInput } from '../../components/ui/TagInput'
import type { BlogCategory, BlogPost } from '../../types/api'

const labelClass = 'text-[13px] font-semibold text-heading'
const inputClass =
  'w-full rounded-lg border border-card-border bg-white px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:border-orange focus:outline-none'

export function BlogPostForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [post, setPost] = useState<BlogPost | null>(null)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [isLoading, setIsLoading] = useState(isEdit)

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [metaDescription, setMetaDescription] = useState('')
  const [content, setContent] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<'publish' | 'draft' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchBlogCategories()
      .then((items) => {
        if (!cancelled) setCategories(items)
      })
      .catch(() => {
        // Categories are optional on this form; a failed fetch just leaves the list empty.
      })

    if (isEdit && id) {
      fetchBlogPost(id)
        .then((found) => {
          if (cancelled) return
          setPost(found)
          setTitle(found.title)
          setAuthor(found.author)
          setCategoryId(found.categoryId ?? '')
          setCoverImage(found.coverImage)
          setTags(found.tags)
          setMetaDescription(found.metaDescription ?? '')
          setContent(found.content)
        })
        .catch((err) => setError(apiErrorMessage(err, 'Failed to load this post.')))
        .finally(() => {
          if (!cancelled) setIsLoading(false)
        })
    } else {
      setAuthor(user?.fullName ?? '')
    }

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleFile(file: File) {
    setIsUploading(true)
    setError(null)
    try {
      const uploaded = await uploadFile(file)
      setCoverImage(uploaded.url)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to upload image.'))
    } finally {
      setIsUploading(false)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function submit(publish: boolean) {
    setError(null)

    if (!title.trim()) return setError('Post title is required.')
    if (!author.trim()) return setError('Author is required.')
    if (!stripHtml(content)) return setError('Blog content is required.')

    setSubmittingAction(publish ? 'publish' : 'draft')
    try {
      const payload: BlogPostInput = {
        title: title.trim(),
        slug: post?.slug ?? slugify(title),
        excerpt: excerptFromHtml(content),
        content,
        author: author.trim(),
        categoryId: categoryId || undefined,
        coverImage: coverImage ?? undefined,
        tags,
        metaDescription: metaDescription.trim() || undefined,
        isPublished: publish,
        publishedAt: publish ? (post?.publishedAt ?? new Date().toISOString()) : undefined,
      }

      if (isEdit && post) {
        await updateBlogPost(post.id, payload)
      } else {
        await createBlogPost(payload)
      }
      navigate('/blog-posts')
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save this post.'))
    } finally {
      setSubmittingAction(null)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading post…</p>
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-header-border bg-white p-8">
      <div className="flex items-start gap-6">
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="post-title">
              Post Title
            </label>
            <input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="e.g. The Divine Shringar of Baba Khatu Shyam"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="post-author">
              Author
            </label>
            <input
              id="post-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className={inputClass}
              placeholder="Priya Sharma"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="post-category">
              Category
            </label>
            <div className="relative">
              <select
                id="post-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`${inputClass} appearance-none pr-9`}
              >
                <option value="">Select Category (Cultural Heritage, Sacred Wisdom...)</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          </div>

          <div className="flex w-full flex-col gap-1.5">
            <span className={labelClass}>Featured Image</span>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors ${
                isDragging ? 'border-orange bg-orange/5' : 'border-card-border bg-search-bg'
              }`}
            >
              {coverImage ? (
                <>
                  <img
                    src={resolveUploadUrl(coverImage) ?? undefined}
                    alt=""
                    className="h-32 w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverImage(null)}
                    className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-white text-heading shadow"
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  {isUploading ? (
                    <Loader2 size={22} className="animate-spin text-orange" />
                  ) : (
                    <UploadCloud size={22} className="text-orange" />
                  )}
                  <p className="text-[13px] font-semibold text-heading">
                    {isUploading ? (
                      'Uploading…'
                    ) : (
                      <>
                        Drag &amp; drop or{' '}
                        <label className="cursor-pointer text-orange underline-offset-2 hover:underline">
                          browse
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFile(file)
                              e.target.value = ''
                            }}
                          />
                        </label>
                      </>
                    )}
                  </p>
                  <p className="text-[11px] text-muted">PNG, JPG or WEBP up to 5MB (Recommended: 1200x630px)</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Tags</span>
            <TagInput tags={tags} onChange={setTags} placeholder="e.g. KhatuDham, Sacred, Bhajan (press enter to add)" />
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label className={labelClass} htmlFor="post-meta">
              SEO Meta Description
            </label>
            <textarea
              id="post-meta"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={5}
              className={`${inputClass} h-[120px] resize-none`}
              placeholder="Brief summary of the post for search engine snippets..."
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Blog Content</label>
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Start writing the divine knowledge and devotional tales here..."
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="h-px w-full bg-header-border" />

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={submittingAction !== null || isUploading}
          onClick={() => submit(true)}
          className="flex items-center gap-2 rounded-lg bg-orange px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submittingAction === 'publish' && <Loader2 size={14} className="animate-spin" />}
          Publish Post
        </button>
        <button
          type="button"
          disabled={submittingAction !== null || isUploading}
          onClick={() => submit(false)}
          className="flex items-center gap-2 rounded-lg border border-header-border bg-search-bg px-6 py-3 text-sm font-semibold text-heading transition-colors hover:bg-white disabled:opacity-60"
        >
          {submittingAction === 'draft' && <Loader2 size={14} className="animate-spin" />}
          Save as Draft
        </button>
        <button
          type="button"
          onClick={() => navigate('/blog-posts')}
          className="text-sm font-medium text-maroon hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
