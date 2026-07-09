import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  PortfolioSummaryDTO,
  PortfolioHistoryDTO,
  IntegrationSummaryDTO,
  PriceAlertDTO,
  AllocationItem,
  ROIItem,
  BenchmarkResult,
  ProviderPerformanceResponse,
  AssetSearchResult,
  AssetCategory,
  ManualHoldingDTO,
  TransactionDTO,
} from '@/lib/types'

export function useTransactions(days = 30, txType?: string, account?: string) {
  const params = new URLSearchParams({ days: String(days) })
  if (txType) params.set('tx_type', txType)
  if (account) params.set('account', account)
  return useQuery<TransactionDTO[]>({
    queryKey: ['transactions', days, txType ?? null, account ?? null],
    queryFn: () => api.get(`/api/v1/transactions?${params.toString()}`).then((r) => r.data),
  })
}

// Buscador de activos (tipo TradingView) para el ingreso manual.
export async function searchAssets(query: string): Promise<AssetSearchResult[]> {
  if (!query.trim()) return []
  const r = await api.get<AssetSearchResult[]>(`/api/v1/assets/search?q=${encodeURIComponent(query)}`)
  return r.data
}

// Cotiza un activo ya elegido (por category + ref) → precio USD actual.
export async function quoteAsset(category: AssetCategory, ref: string): Promise<number> {
  const r = await api.get<{ price_usd: number }>(
    `/api/v1/assets/quote?category=${encodeURIComponent(category)}&ref=${encodeURIComponent(ref)}`
  )
  return r.data.price_usd ?? 0
}

export function usePortfolio() {
  return useQuery<PortfolioSummaryDTO>({
    queryKey: ['portfolio'],
    queryFn: () => api.get('/api/v1/dashboard/').then((r) => r.data),
  })
}

export function usePortfolioHistory(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()

  return useQuery<PortfolioHistoryDTO>({
    queryKey: ['portfolio-history', from, to],
    queryFn: () => api.get(`/api/v1/dashboard/history${qs ? '?' + qs : ''}`).then((r) => r.data),
  })
}

export function useRefreshPortfolio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/api/v1/dashboard/refresh'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  })
}

export function useIntegrations() {
  return useQuery<IntegrationSummaryDTO[]>({
    queryKey: ['integrations'],
    queryFn: () => api.get('/api/v1/integrations/').then((r) => r.data),
  })
}

export function useAddIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { provider_type: string; credentials: Record<string, unknown> }) =>
      api.post('/api/v1/integrations/', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}

export function useUpdateIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, credentials }: { id: string; credentials: Record<string, unknown> }) =>
      api.patch(`/api/v1/integrations/${id}`, { credentials }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}

export function useDeleteIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/integrations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}

export function useImportIOL() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post('/api/v1/integrations/iol/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}

// Posiciones de una integración manual / IOL-import (para mostrarlas por activo).
export function useManualHoldings(id: string, enabled: boolean) {
  return useQuery<{ institution_name: string; holdings: ManualHoldingDTO[]; editable?: boolean }>({
    queryKey: ['manual-holdings', id],
    queryFn: () => api.get(`/api/v1/integrations/${id}/manual`).then((r) => r.data),
    enabled,
  })
}

export function useSyncIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/integrations/${id}/sync`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api.post('/api/v1/auth/change-password', data).then((r) => r.data),
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (confirm_email: string) =>
      api.delete(`/api/v1/auth/me?confirm_email=${encodeURIComponent(confirm_email)}`).then((r) => r.data),
  })
}

export function useAllocation() {
  return useQuery<{ total_usd: number; by_asset: AllocationItem[]; by_provider: AllocationItem[]; by_type: AllocationItem[] }>({
    queryKey: ['allocation'],
    queryFn: () => api.get('/api/v1/dashboard/allocation').then((r) => r.data),
  })
}

export function useROI() {
  return useQuery<ROIItem[]>({
    queryKey: ['roi'],
    queryFn: () => api.get('/api/v1/dashboard/roi').then((r) => r.data),
  })
}

export function useBenchmark(asset: string, period: string) {
  return useQuery<BenchmarkResult>({
    queryKey: ['benchmark', asset, period],
    queryFn: () => api.get(`/api/v1/dashboard/benchmark?asset=${asset}&period=${period}`).then((r) => r.data),
  })
}

export function useAlerts() {
  return useQuery<PriceAlertDTO[]>({
    queryKey: ['alerts'],
    queryFn: () => api.get('/api/v1/alerts').then((r) => r.data),
  })
}

export function useCreateAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { asset_symbol: string; threshold_usd: number; direction: string; note?: string }) =>
      api.post('/api/v1/alerts', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
}

export function useToggleAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/api/v1/alerts/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
}

export function useDeleteAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/alerts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
}


export function useProviderPerformance(days: number = 30) {
  return useQuery<ProviderPerformanceResponse>({
    queryKey: ['provider-performance', days],
    queryFn: () =>
      api.get(`/api/v1/dashboard/performance?days=${days}`).then((r) => r.data),
  })
}
