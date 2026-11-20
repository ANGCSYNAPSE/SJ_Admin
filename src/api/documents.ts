import { api } from './client'

export type DocumentKind = 'receipt' | 'invoice'

/** The receipt (for one paid payment) or the member's registration-fee invoice, as a PDF. */
export async function fetchPaymentDocument(paymentId: string, kind: DocumentKind = 'receipt') {
  const res = await api.get<Blob>(`/admin/payments/${paymentId}/document`, { params: { kind }, responseType: 'blob' })
  return res.data
}

/** Saves a PDF blob to the admin's computer. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}.pdf`
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}
