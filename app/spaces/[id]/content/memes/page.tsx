import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MemeCreator } from '@/app/components/content-creators/MemeCreator'

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
  const { data: insights } = await supabase
    .from('audience_insights')
    .select('*')
    .eq('agent_id', space.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-7xl mx-auto p-6">
      <MemeCreator space={space} insights={insights || []} />
    </div>
  )
}
