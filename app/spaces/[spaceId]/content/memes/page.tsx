import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MemeCreatorWizard } from '@/app/components/MemeCreatorWizard'
import { ToastProvider } from '@/components/ui/toast'
import { Laugh } from 'lucide-react'
import type { AudienceInsight } from '@/lib/types'

export default async function MemesPage({
  params,
}: {
  params: Promise<{ spaceId: string }>
}) {
  const { spaceId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch space
  const { data: space } = await supabase
    .from('spaces')
    .select('*')
    .eq('id', spaceId)
    .eq('user_id', user.id)
    .single()

  if (!space) {
    redirect('/spaces')
  }

  // Fetch insights for this space through agents
  const { data: agents } = await supabase
    .from('agents')
    .select('id')
    .eq('space_id', spaceId)

  const agentIds = agents?.map(a => a.id) || []
  
  let insights: AudienceInsight[] = []
  if (agentIds.length > 0) {
    const { data: insightsData } = await supabase
      .from('audience_insights')
      .select('*')
      .in('agent_id', agentIds)
      .order('created_at', { ascending: false })
      .limit(50)
    
    insights = (insightsData || []) as AudienceInsight[]
  }

  return (
    <ToastProvider>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg p-3">
              <Laugh className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kreator Memów</h1>
              <p className="text-gray-600">
                Generuj viralowe memy z pomocą AI - {space.name}
              </p>
            </div>
          </div>
        </div>

        {/* Wizard with insights */}
        <MemeCreatorWizard insights={insights} spaceId={spaceId} />
      </div>
    </ToastProvider>
  )
}
