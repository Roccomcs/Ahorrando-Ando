export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface User {
  id: string
  email: string
  created_at: string
}

export interface HoldingDTO {
  asset_name: string
  asset_symbol: string
  amount: number
  current_value_usd: number
  performance_24h: number
  performance_30d: number
}

export interface ProviderSummaryDTO {
  provider: string
  balance_usd: number
  holdings: HoldingDTO[]
  performance: Record<string, number>
}

export interface PortfolioSummaryDTO {
  total_usd: number
  change_pct_24h: number | null
  change_pct_30d: number | null
  providers: ProviderSummaryDTO[]
}

export interface HistoryPoint {
  snapshot_at: string
  total_usd: number
}

export interface PortfolioHistoryDTO {
  points: HistoryPoint[]
  change_pct_24h: number | null
  change_pct_30d: number | null
}

export interface IntegrationSummaryDTO {
  id: string
  provider_type: string
  is_active: boolean
  last_error: string | null
  last_sync_at: string | null
}

export type ProviderType =
  | 'binance'
  | 'mercadopago'
  | 'bullmarket'
  | 'lemoncash'
  | 'iol'
  | 'onchain'
  | 'solana'
  | 'balanz_csv'
  | 'manual'

export interface AllocationItem {
  label: string
  usd_value: number
  percentage: number
  category: string
}

export interface ROIItem {
  asset_symbol: string
  asset_name: string
  provider: string
  amount: number
  current_value_usd: number
  performance_24h: number
  performance_30d: number
  roi_pct: number | null
}

export interface ProviderPerformancePoint {
  date: string
  balance_usd: number
}

export interface ProviderPerformanceItem {
  provider: string
  label: string
  current_usd: number
  change_pct_24h: number | null
  change_pct_7d: number | null
  change_pct_30d: number | null
  history: ProviderPerformancePoint[]
}

export interface ProviderPerformanceResponse {
  providers: ProviderPerformanceItem[]
}

export interface BenchmarkResult {
  period: string
  benchmark_asset: string
  portfolio_change_pct: number | null
  asset_change_pct: number | null
  outperformed: boolean
  snapshot_count: number
}

export interface PriceAlertDTO {
  id: string
  asset_symbol: string
  threshold_usd: number
  direction: 'above' | 'below'
  is_active: boolean
  note: string | null
  created_at: string
  triggered_at: string | null
}
