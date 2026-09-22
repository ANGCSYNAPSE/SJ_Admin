import { api } from './client'
import type { ApiEnvelope, BlogCategory, BlogPost } from '../types/api'

export async function fetchBlogPosts() {
  const res = await api.get<ApiEnvelope<BlogPost[]>>('/blog-posts')
  return res.data.data
}

export async function fetchBlogPost(id: string) {
  const res = await api.get<ApiEnvelope<BlogPost>>(`/blog-posts/${id}`)
  return res.data.data
}

export async function fetchBlogCategories() {
  const res = await api.get<ApiEnvelope<BlogCategory[]>>('/blog-categories')
  return res.data.data
}

export interface BlogPostInput {
  title: string
  slug: string
  excerpt: string
  content: string
  author: string
  categoryId?: string
  coverImage?: string
  tags: string[]
  metaDescription?: string
  isPublished: boolean
  publishedAt?: string
}

export async function createBlogPost(input: BlogPostInput) {
  const res = await api.post<ApiEnvelope<BlogPost>>('/blog-posts', input)
  return res.data.data
}

export async function updateBlogPost(id: string, input: Partial<BlogPostInput>) {
  const res = await api.patch<ApiEnvelope<BlogPost>>(`/blog-posts/${id}`, input)
  return res.data.data
}

export async function deleteBlogPost(id: string) {
  await api.delete(`/blog-posts/${id}`)
}
