import { apiClient } from './client'
import type { ApiResponse } from '@/types'

export interface PermissionItem {
  codename: string
  name: string
  full_code: string
}

export interface AdminGroup {
  id: number
  name: string
  permissions: string[]
  permission_labels?: { codename: string; name: string }[]
  user_count?: number
}

export interface AdminManagedUser {
  id: number
  username: string
  email?: string
  first_name?: string
  last_name?: string
  is_staff: boolean
  is_active: boolean
  is_superuser: boolean
  groups: { id: number; name: string }[]
  permissions: string[]
  bale_chat_id?: string
  bale_enabled: boolean
}

export interface UserPayload {
  username?: string
  password?: string
  email?: string
  first_name?: string
  last_name?: string
  is_staff?: boolean
  is_active?: boolean
  is_superuser?: boolean
  group_ids?: number[]
  bale_chat_id?: string
  bale_enabled?: boolean
}

export const accountsApi = {
  getPermissions: async (): Promise<ApiResponse<{ items: PermissionItem[] }>> => {
    const response = await apiClient.get('/kiosk/accounts/permissions/')
    return response.data
  },

  getGroups: async (): Promise<ApiResponse<{ results: AdminGroup[] }>> => {
    const response = await apiClient.get('/kiosk/accounts/groups/')
    return response.data
  },

  createGroup: async (data: { name: string; permissions: string[] }): Promise<ApiResponse<AdminGroup>> => {
    const response = await apiClient.post('/kiosk/accounts/groups/', data)
    return response.data
  },

  updateGroup: async (
    id: number,
    data: { name?: string; permissions?: string[] }
  ): Promise<ApiResponse<AdminGroup>> => {
    const response = await apiClient.patch(`/kiosk/accounts/groups/${id}/`, data)
    return response.data
  },

  deleteGroup: async (id: number): Promise<void> => {
    await apiClient.delete(`/kiosk/accounts/groups/${id}/`)
  },

  getUsers: async (): Promise<ApiResponse<{ results: AdminManagedUser[] }>> => {
    const response = await apiClient.get('/kiosk/accounts/users/')
    return response.data
  },

  createUser: async (data: UserPayload): Promise<ApiResponse<AdminManagedUser>> => {
    const response = await apiClient.post('/kiosk/accounts/users/', data)
    return response.data
  },

  updateUser: async (id: number, data: UserPayload): Promise<ApiResponse<AdminManagedUser>> => {
    const response = await apiClient.patch(`/kiosk/accounts/users/${id}/`, data)
    return response.data
  },

  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`/kiosk/accounts/users/${id}/`)
  },

  getBaleSettings: async (): Promise<ApiResponse<BaleBotPanelSettings>> => {
    const response = await apiClient.get('/kiosk/bale/settings/')
    return response.data
  },

  updateBaleSettings: async (data: {
    is_enabled?: boolean
    bot_token?: string
    api_base?: string
    clear_token?: boolean
  }): Promise<ApiResponse<BaleBotPanelSettings>> => {
    const response = await apiClient.patch('/kiosk/bale/settings/', data)
    return response.data
  },
}

export interface BaleBotPanelSettings {
  is_enabled: boolean
  has_token: boolean
  token_masked: string
  api_base: string
  is_runtime_active: boolean
  updated_at?: string | null
}

