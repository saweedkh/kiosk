import { apiClient } from './client'
import type { ApiResponse, Product, Category, PaginatedResponse } from '@/types'

export const productsApi = {
  getProducts: async (params?: {
    category?: number
    in_stock?: boolean
    is_active?: boolean
    min_price?: number
    max_price?: number
    page?: number
    page_size?: number
    search?: string
  }): Promise<ApiResponse<PaginatedResponse<Product>>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Product>>>(
      '/api/kiosk/products/products/',
      { params }
    )
    return response.data
  },

  getProduct: async (id: number): Promise<ApiResponse<Product>> => {
    const response = await apiClient.get<ApiResponse<Product>>(
      `/api/kiosk/products/products/${id}/`
    )
    return response.data
  },

  searchProducts: async (query: string): Promise<ApiResponse<Product[]>> => {
    const response = await apiClient.get<ApiResponse<Product[]>>(
      '/api/kiosk/products/products/search/',
      { params: { q: query } }
    )
    return response.data
  },

  getCategories: async (params?: {
    page?: number
    page_size?: number
    search?: string
  }): Promise<ApiResponse<Category[] | PaginatedResponse<Category>>> => {
    // Request all categories with a large page_size
    const response = await apiClient.get<ApiResponse<Category[] | PaginatedResponse<Category>>>(
      '/api/kiosk/products/categories/',
      { params: { ...params, page_size: params?.page_size || 1000 } }
    )
    return response.data
  },

  getCategory: async (id: number): Promise<ApiResponse<Category>> => {
    const response = await apiClient.get<ApiResponse<Category>>(
      `/api/kiosk/products/categories/${id}/`
    )
    return response.data
  },

  getCategoryProducts: async (id: number): Promise<ApiResponse<Product[]>> => {
    const response = await apiClient.get<ApiResponse<Product[]>>(
      `/api/kiosk/products/categories/${id}/products/`
    )
    return response.data
  },
}

