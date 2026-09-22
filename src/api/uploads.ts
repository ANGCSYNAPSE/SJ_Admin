import { api } from './client'
import type { ApiEnvelope } from '../types/api'

interface UploadResult {
  url: string
  filename: string
  mimeType: string
  size: number
}

export async function uploadFile(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<ApiEnvelope<UploadResult>>('/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}
