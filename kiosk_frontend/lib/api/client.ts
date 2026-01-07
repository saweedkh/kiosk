import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/lib/store/auth-store'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const { accessToken } = useAuthStore.getState()
        
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`
        }

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          const { refreshToken, logout } = useAuthStore.getState()

          if (refreshToken) {
            try {
              // Try to refresh token
              const refreshUrl = API_BASE_URL.startsWith('http') 
                ? `${API_BASE_URL}/kiosk/admin/auth/refresh/`
                : `/kiosk/admin/auth/refresh/`
              const response = await axios.post(refreshUrl, {
                refresh: refreshToken,
              })

              const { access } = response.data
              useAuthStore.getState().setAuth(
                access,
                refreshToken,
                useAuthStore.getState().user!
              )

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${access}`
              }

              return this.client(originalRequest)
            } catch (refreshError) {
              logout()
              if (typeof window !== 'undefined') {
                window.location.href = '/admin/login'
              }
              return Promise.reject(refreshError)
            }
          } else {
            logout()
            if (typeof window !== 'undefined') {
              window.location.href = '/admin/login'
            }
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

