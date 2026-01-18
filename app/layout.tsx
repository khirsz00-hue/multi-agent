import type { Metadata } from 'next'
import './globals.css'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Multi-Agent Platform',
  description: 'AI-powered multi-agent platform with spaces, file uploads, and chat',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AppLayout user={user}>
          {children}
        </AppLayout>
      </body>
    </html>
  )
}
