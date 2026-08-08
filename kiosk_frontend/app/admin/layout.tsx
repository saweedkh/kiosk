import { KioskExitHotkey } from '@/components/shared/KioskExitHotkey'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <KioskExitHotkey />
      {children}
    </>
  )
}

