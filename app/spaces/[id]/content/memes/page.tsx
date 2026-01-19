import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MemeCreator } from '@/app/components/content-creators/MemeCreator'
import type { AudienceInsight } from '@/lib/types'

export default async function MemesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch space
  const { data: space } = await supabase
    .from('spaces')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!space) {
    redirect('/dashboard')
  }

  // Fetch insights for this space - using audience_insights table
  // Since notion_insights doesn't exist, we use audience_insights which can have source='notion'
  // We need to fetch insights through agents associated with this space
  const { data: agents } = await supabase
    .from('agents')
    .select('id')
    .eq('space_id', id)

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
    <div className="max-w-7xl mx-auto p-6">
      <MemeCreator space={space} insights={insights} />
    </div>
  )
}
