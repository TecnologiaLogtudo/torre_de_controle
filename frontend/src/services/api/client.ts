/// <reference types="vite/client" />
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { storage } from '@/utils/storage'
import { parseApiError } from './errors'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

type UnauthorizedHandler = () => void
let onUnauthorizedCallback: UnauthorizedHandler | null = null

export function setOnUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorizedCallback = handler
}

// Interceptor de Requisições: Injeta token JWT
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = storage.getToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(parseApiError(error))
)

// Interceptor de Respostas: Trata erro 401 e padroniza os erros
apiClient.interceptors.response.use(
  response => response,
  error => {
    const parsedError = parseApiError(error)

    if (parsedError.statusCode === 401) {
      storage.removeToken()
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback()
      }
    }

    return Promise.reject(parsedError)
  }
)
