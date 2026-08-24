export interface ApiError {
  message: string
  statusCode?: number
  detail?: string
  raw?: unknown
}
