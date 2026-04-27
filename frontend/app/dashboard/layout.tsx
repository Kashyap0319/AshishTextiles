import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CaratSense | Dashboard',
  description: 'Surplus Stock Intelligence Dashboard',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
