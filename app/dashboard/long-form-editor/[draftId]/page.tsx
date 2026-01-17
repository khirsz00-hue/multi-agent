import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LongFormEditor from '@/components/LongFormEditor'

export default async function LongFormEditorPage({
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
    <div className="min-h-screen bg-gray-50">
      <LongFormEditor draftId={draftId} />
    </div>
  )
}
