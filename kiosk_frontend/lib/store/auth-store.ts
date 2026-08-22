import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  username: string
  email?: string
  first_name?: string
  last_name?: string
  is_staff: boolean
  is_active: boolean
  is_superuser?: boolean
  groups?: { id: number; name: string }[]
  permissions?: string[]
  bale_chat_id?: string
  bale_enabled?: boolean
}

interface AuthStore {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  hasHydrated: boolean
  setAuth: (accessToken: string, refreshToken: string, user: User) => void
  setTokens: (accessToken: string, refreshToken?: string | null) => void
  logout: () => void
  updateUser: (user: User) => void
  setHasHydrated: (value: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (accessToken, refreshToken, user) =>
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        }),
      setTokens: (accessToken, refreshToken) =>
        set((state) => ({
          accessToken,
          refreshToken:
            refreshToken === undefined ? state.refreshToken : refreshToken,
          isAuthenticated: Boolean(accessToken && state.user),
        })),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
      updateUser: (user) => set({ user }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Use the rehydrated state action only — never touch `useAuthStore`
        // here. Sync rehydrate runs during `create()`, so referencing the
        // const causes a TDZ throw; zustand then never marks hydration done.
        state?.setHasHydrated(true)
      },
    }
  )
)
