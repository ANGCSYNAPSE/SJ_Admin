import { api } from './client'
import type { ApiEnvelope } from '../types/api'

export interface FeeRules {
  total: number
  minimum: number
}

export interface FeeSettings {
  fee: FeeRules
  defaults: FeeRules
  updatedAt: string | null
  updatedBy: string | null
}

export interface PaymentSummary {
  fee: FeeRules
  collected: { amount: number; payments: number; today: { amount: number; count: number } }
  members: { total: number; fullyPaid: number; partial: number; unpaid: number }
  outstanding: { amount: number; failedAttempts: number; abandonedCheckouts: number }
  collectionRate: number
}

export type PaymentStatus = 'created' | 'paid' | 'failed'
export type PaymentKind = 'part' | 'full' | 'manual'

export interface PaymentRow {
  id: string
  userId: string | null
  fullName: string
  email: string
  mobile: string
  plan: PaymentKind
  amount: number
  /** How much of it has gone back to the payer. */
  refunded: number
  status: PaymentStatus
  source: 'razorpay' | 'manual'
  receipt: string
  razorpayOrderId: string
  razorpayPaymentId: string | null
  failureReason: string | null
  note: string | null
  paidAt: string | null
  createdAt: string
}

export interface OwingUser {
  id: string
  fullName: string
  email: string
  mobile: string
  joinedAt: string
  registrations: string[]
  state: 'pending' | 'partial'
  paid: number
  balance: number
  lastAttempt: { status: PaymentStatus; amount: number; at: string } | null
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface Diagnostics {
  keys: {
    keyId: string | null
    keyIdSet: boolean
    keySecretSet: boolean
    keySecretLength: number
    webhookSecretSet: boolean
    webhookSecretLength: number
  }
  mode: 'test' | 'live' | 'unknown'
  environment: string
  webhookUrl: string
  warnings: string[]
  apiCheck: { ok: boolean; status: number | null; message: string }
}

export async function fetchPaymentSummary() {
  return (await api.get<ApiEnvelope<PaymentSummary>>('/admin/payments/summary')).data.data
}

export async function fetchFeeSettings() {
  return (await api.get<ApiEnvelope<FeeSettings>>('/admin/payments/settings')).data.data
}

export async function saveFeeSettings(fee: FeeRules) {
  return (await api.put<ApiEnvelope<{ fee: FeeRules }>>('/admin/payments/settings', fee)).data.data.fee
}

export async function fetchDiagnostics() {
  return (await api.get<ApiEnvelope<Diagnostics>>('/admin/payments/diagnostics')).data.data
}

export async function fetchOwing(params: { state?: string; q?: string; page: number; limit: number }) {
  return (await api.get<ApiEnvelope<Page<OwingUser>>>('/admin/payments/pending', { params })).data.data
}

export async function fetchPayments(params: { status?: string; plan?: string; q?: string; userId?: string; page: number; limit: number }) {
  return (await api.get<ApiEnvelope<Page<PaymentRow>>>('/admin/payments', { params })).data.data
}

export async function recordManualPayment(input: { userId: string; amount: number; reference: string; note?: string }) {
  return (await api.post<ApiEnvelope<PaymentRow>>('/admin/payments/manual', input)).data.data
}

/** Asks Razorpay what happened to a payment stuck as "not finished": marks it paid if money was captured, else abandoned. */
export async function reconcilePayment(id: string) {
  const res = await api.post<ApiEnvelope<PaymentRow> & { message: string }>(`/admin/payments/${id}/reconcile`)
  return { payment: res.data.data, message: res.data.message }
}

/** Refunds all (leave `amount` out) or part of a paid payment. Razorpay payments are refunded through Razorpay. */
export async function refundPayment(id: string, input: { amount?: number; reason: string }) {
  const res = await api.post<ApiEnvelope<{ belowMinimum: boolean }> & { message: string }>(`/admin/payments/${id}/refund`, input)
  return { message: res.data.message, belowMinimum: res.data.data.belowMinimum }
}

/** Refunds some or all of everything one person has paid, newest payments first. Leave `amount` out for the lot. */
export async function refundFee(input: { userId: string; amount?: number; reason: string }) {
  const res = await api.post<ApiEnvelope<{ total: number; belowMinimum: boolean }> & { message: string }>('/admin/payments/refund-fee', input)
  return { message: res.data.message, total: res.data.data.total, belowMinimum: res.data.data.belowMinimum }
}
