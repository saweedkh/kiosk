import type { User } from '@/types'

export const APP_PERMISSIONS = [
  'view_reports',
  'view_products',
  'add_products',
  'change_products',
  'delete_products',
  'change_stock',
  'view_categories',
  'add_categories',
  'change_categories',
  'delete_categories',
  'view_orders',
  'change_orders',
  'change_settings',
  'manage_coupons',
  'manage_users',
  'manage_bale',
] as const

export type AppPermission = (typeof APP_PERMISSIONS)[number]

type PermissionUser = Pick<User, 'is_superuser' | 'permissions'> | null | undefined

export function hasPermission(user: PermissionUser, code: AppPermission): boolean {
  if (!user) return false
  if (user.is_superuser) return true
  return (user.permissions || []).includes(code)
}

export function hasAnyPermission(
  user: PermissionUser,
  codes: AppPermission[]
): boolean {
  return codes.some((code) => hasPermission(user, code))
}
