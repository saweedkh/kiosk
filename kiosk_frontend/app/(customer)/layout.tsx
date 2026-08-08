import { KioskExitHotkey } from '@/components/shared/KioskExitHotkey'
import { CustomerFullscreen } from '@/components/shared/CustomerFullscreen'

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <KioskExitHotkey />
      <CustomerFullscreen />
      {children}
    </>
  )
}

