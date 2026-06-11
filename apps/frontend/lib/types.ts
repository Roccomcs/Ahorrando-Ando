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
}

export type ProviderType = 'binance' | 'mercadopago' | 'bullmarket' | 'lemoncash' | 'iol' | 'onchain'
