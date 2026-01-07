import { apiClient } from './client'
import type { ApiResponse, Category, Product } from '@/types'

export const adminApi = {
  // Categories
  getCategories: async (params?: {
    page?: number
    page_size?: number
    search?: string
    is_active?: boolean
    parent?: number
    ordering?: string
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/kiosk/admin/categories/', { params })
    return response.data
  },

  getCategory: async (id: number): Promise<ApiResponse<Category>> => {
    const response = await apiClient.get(`/kiosk/admin/categories/${id}/`)
    return response.data
  },

  createCategory: async (data: {
    name: string
    parent?: number | null
    display_order?: number
    is_active?: boolean
  }): Promise<ApiResponse<Category>> => {
    const response = await apiClient.post('/kiosk/admin/categories/', data)
    return response.data
  },

  updateCategory: async (
    id: number,
    data: {
      name: string
      parent?: number | null
      display_order?: number
      is_active?: boolean
    }
  ): Promise<ApiResponse<Category>> => {
    const response = await apiClient.put(`/kiosk/admin/categories/${id}/`, data)
    return response.data
  },

  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(`/kiosk/admin/categories/${id}/`)
  },

  // Products
  getProducts: async (params?: {
    page?: number
    page_size?: number
    search?: string
    category?: number
    is_active?: boolean
    in_stock?: boolean
    ordering?: string
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/kiosk/admin/products/', { params })
    return response.data
  },

  getProduct: async (id: number): Promise<ApiResponse<Product>> => {
    const response = await apiClient.get(`/kiosk/admin/products/${id}/`)
    return response.data
  },

  createProduct: async (data: FormData | {
    name: string
    description?: string
    price: number
    category?: number | null
    image?: File | string | null
    stock_quantity?: number
    is_active?: boolean
  }): Promise<ApiResponse<Product>> => {
    // If data is already FormData, use it directly
    if (data instanceof FormData) {
      console.log('Using provided FormData for createProduct')
      const response = await apiClient.post('/kiosk/admin/products/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    }

    // Otherwise, create FormData from object
    const formData = new FormData()
    formData.append('name', data.name)
    if (data.description) formData.append('description', data.description)
    formData.append('price', data.price.toString())
    if (data.category) formData.append('category', data.category.toString())
    if (data.image instanceof File) {
      console.log('Appending image to FormData:', data.image.name, data.image.size)
      formData.append('image', data.image)
    }
    if (data.stock_quantity !== undefined)
      formData.append('stock_quantity', data.stock_quantity.toString())
    if (data.is_active !== undefined)
      formData.append('is_active', data.is_active.toString())

    const response = await apiClient.post('/kiosk/admin/products/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  updateProduct: async (
    id: number,
    data: FormData | {
      name?: string
      description?: string
      price?: number
      category?: number | null
      image?: File | string | null
      stock_quantity?: number
      is_active?: boolean
    }
  ): Promise<ApiResponse<Product>> => {
    // If data is already FormData, use it directly
    if (data instanceof FormData) {
      const response = await apiClient.patch(`/kiosk/admin/products/${id}/`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    }

    // Otherwise, create FormData from object
    const formData = new FormData()
    if (data.name) formData.append('name', data.name)
    if (data.description) formData.append('description', data.description)
    if (data.price !== undefined) formData.append('price', data.price.toString())
    if (data.category) formData.append('category', data.category.toString())
    if (data.image instanceof File) {
      console.log('Appending image to FormData:', data.image.name, data.image.size)
      formData.append('image', data.image)
    }
    if (data.stock_quantity !== undefined)
      formData.append('stock_quantity', data.stock_quantity.toString())
    if (data.is_active !== undefined)
      formData.append('is_active', data.is_active.toString())

    const response = await apiClient.patch(`/kiosk/admin/products/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  deleteProduct: async (id: number): Promise<void> => {
    await apiClient.delete(`/kiosk/admin/products/${id}/`)
  },

  // Settings
  getSettings: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/kiosk/settings/admin/')
    return response.data
  },

  updateSettings: async (data: {
    site_name?: string
    copyright_text?: string
    contact_phone?: string
    logo?: File | string
    [key: string]: any
  }): Promise<ApiResponse<any>> => {
    // همیشه از FormData استفاده می‌کنیم برای multipart/form-data
    const formData = new FormData()
    
    // ارسال همه فیلدها (حتی اگر خالی باشند)
    // site_name
    if (data.site_name !== undefined) {
      formData.append('site_name', data.site_name || '')
    }
    
    // copyright_text
    if (data.copyright_text !== undefined) {
      formData.append('copyright_text', data.copyright_text || '')
    }
    
    // contact_phone
    if (data.contact_phone !== undefined) {
      formData.append('contact_phone', data.contact_phone || '')
    }
    
    // logo (فقط اگر File باشد)
    if (data.logo instanceof File) {
      formData.append('logo', data.logo)
    }
    
    // سایر فیلدها
    Object.keys(data).forEach((key) => {
      if (key !== 'logo' && key !== 'site_name' && key !== 'copyright_text' && key !== 'contact_phone') {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, String(data[key]))
        }
      }
    })
    
    const response = await apiClient.put('/kiosk/settings/admin/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  patchSettings: async (data: {
    site_name?: string
    copyright_text?: string
    contact_phone?: string
    logo?: File | string
    [key: string]: any
  }): Promise<ApiResponse<any>> => {
    // همیشه از FormData استفاده می‌کنیم برای multipart/form-data
    const formData = new FormData()
    
    Object.keys(data).forEach((key) => {
      if (key === 'logo' && data.logo instanceof File) {
        // اگر لوگو یک File است، آن را اضافه کن
        formData.append('logo', data.logo)
      } else if (key !== 'logo' && data[key] !== undefined && data[key] !== null) {
        // سایر فیلدها را به صورت string اضافه کن
        formData.append(key, String(data[key]))
      }
    })
    
    const response = await apiClient.patch('/kiosk/settings/admin/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

