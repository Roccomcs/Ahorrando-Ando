export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface User {
  id: string
  email: string
  created_at: string
  email_verified: boolean
}

export interface HoldingDTO {
  asset_name: string
  asset_symbol: string
  amount: number
  current_value_usd: number
  performance_24h: number
  performance_30d: number
  category?: AssetCategory | null
  logo_url?: string | null
}

export interface ProviderSummaryDTO {
  provider: string
  balance_usd: number
  holdings: HoldingDTO[]
  performance: Record<string, number>
  provider_type: string
  integration_id: string
}

export interface PortfolioSummaryDTO {
  total_usd: number
  usd_to_ars: number | null
  change_pct_24h: number | null
  change_pct_30d: number | null
  providers: ProviderSummaryDTO[]
}

export interface HistoryPoint {
  snapshot_at: string
  total_usd: number
}

export interface AssetHistoryPoint {
  t: number
  price_usd: number
}

export interface AssetHistoryResponse {
  category: string
  ref: string
  days: number
  available: boolean
  points: AssetHistoryPoint[]
}

export interface PortfolioHistoryDTO {
  points: HistoryPoint[]
  usd_to_ars: number | null
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
  | 'bullmarket_csv'
  | 'manual'

export type AssetCategory = 'crypto' | 'stock' | 'cedear' | 'bond' | 'fx'

export interface AssetSearchResult {
  symbol: string
  name: string
  category: AssetCategory
  ref: string
  price_usd: number
  logo_url?: string | null
}

export interface ManualHoldingDTO {
  symbol: string
  name?: string
  amount: number
  category?: AssetCategory
  ref?: string
  price_usd?: number
  logo_url?: string | null
}

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
  category?: AssetCategory | null
  logo_url?: string | null
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

export type TransactionType = 'buy' | 'sell' | 'deposit' | 'withdrawal' | 'yield'

export interface TransactionDTO {
  id: string
  tx_type: TransactionType
  amount_usd: number
  account: string
  asset_symbol: string | null
  quantity: number | null
  price_usd: number | null
  note: string | null
  occurred_at: string
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
