import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuickContentEditor from '@/components/quick-editor/QuickContentEditor'

export default async function QuickEditorPage({ 
  params 
}: { 
  params: Promise<{ draftId: string }> 
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { draftId } = await params

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <QuickContentEditor draftId={draftId} />
    </div>
  )
}
