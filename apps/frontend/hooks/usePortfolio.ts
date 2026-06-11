import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PortfolioSummaryDTO, PortfolioHistoryDTO, IntegrationSummaryDTO } from '@/lib/types'

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
    mutationFn: (data: { provider_type: string; credentials: Record<string, string> }) =>
      api.post('/api/v1/integrations/', data).then((r) => r.data),
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
