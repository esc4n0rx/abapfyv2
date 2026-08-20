import type { ReactNode } from 'react'
import { requireAdmin } from '@/lib/auth'
import { DashboardShell } from '@/components/DashboardShell'

export default async function DashboardLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const admin = await requireAdmin()
  return <DashboardShell admin={admin}>{children}</DashboardShell>
}
