import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SpaceSidebar } from '@/app/components/SpaceSidebar'
import { SpaceBreadcrumbs } from '@/app/components/SpaceBreadcrumbs'

export default async function SpaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { spaceId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch space with access check
  const { data: space, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('id', params.spaceId)
    .eq('user_id', user.id)
    .single()

  if (error || !space) {
    redirect('/spaces')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <SpaceSidebar space={space} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumbs */}
        <SpaceBreadcrumbs space={space} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
