import type { QueryClient } from '@tanstack/react-query'
import type { ApiResponse } from '@/types'
import type { Settings } from '@/lib/api/settings'
import {
  writeCachedSettings,
  getSettingsUpdatedEventName,
} from '@/lib/kiosk-persist'

/** Push admin-saved settings into RQ + localStorage so the customer UI updates immediately. */
export function publishSettingsToCustomer(
  queryClient: QueryClient,
  settings: Settings
): void {
  writeCachedSettings(settings, { force: true })
  const payload: ApiResponse<Settings> = {
    result: settings,
    status: 200,
    success: true,
    messages: {},
  }
  queryClient.setQueryData(['settings'], payload)
  void queryClient.invalidateQueries({ queryKey: ['settings'] })
  if (typeof window !== 'undefined') {
    // Same-tab listeners (storage event does not fire in-process)
    window.dispatchEvent(new Event(getSettingsUpdatedEventName()))
  }
}
