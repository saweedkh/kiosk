import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/lib/store/auth-store'
import { getBrowserApiBaseUrl } from './base-url'

const API_BASE_URL = getBrowserApiBaseUrl()

function extractAccessToken(payload: any): string | null {
  if (!payload || typeof payload !== 'object') return null
  const result = payload.result ?? payload
  return (
    result.access_token ||
    result.access ||
    payload.access_token ||
    payload.access ||
    null
  )
}

function extractRefreshToken(payload: any): string | null {
  if (!payload || typeof payload !== 'object') return null
  const result = payload.result ?? payload
  return (
    result.refresh_token ||
    result.refresh ||
    payload.refresh_token ||
    payload.refresh ||
    null
  )
}

class ApiClient {
  private client: AxiosInstance
  private refreshPromise: Promise<string | null> | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private async refreshAccessToken(): Promise<string | null> {
    const { refreshToken, setTokens, logout } = useAuthStore.getState()
    if (!refreshToken) {
      logout()
      return null
    }

    const refreshUrl = API_BASE_URL.startsWith('http')
      ? `${API_BASE_URL}/kiosk/admin/auth/refresh/`
      : `/kiosk/admin/auth/refresh/`

    const response = await axios.post(refreshUrl, {
      refresh: refreshToken,
    })

    const access = extractAccessToken(response.data)
    const nextRefresh = extractRefreshToken(response.data)

    if (!access) {
      logout()
      return null
    }

    setTokens(access, nextRefresh || refreshToken)
    return access
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const { accessToken } = useAuthStore.getState()

        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`
        }

        return config
      },
      (error) => Promise.reject(error)
    )

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean
        }

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            if (!this.refreshPromise) {
              this.refreshPromise = this.refreshAccessToken().finally(() => {
                this.refreshPromise = null
              })
            }

            const access = await this.refreshPromise
            if (!access) {
              if (typeof window !== 'undefined') {
                window.location.href = '/admin/login'
              }
              return Promise.reject(error)
            }

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access}`
            }

            return this.client(originalRequest)
          } catch (refreshError) {
            useAuthStore.getState().logout()
            if (typeof window !== 'undefined') {
              window.location.href = '/admin/login'
            }
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  get instance() {
    return this.client
  }
}

export const apiClient = new ApiClient().instance
