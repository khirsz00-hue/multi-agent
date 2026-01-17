import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LongFormEditor from '@/components/LongFormEditor'

export default async function LongFormEditorPage({
  params
}: {
  params: { draftId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <LongFormEditor draftId={params.draftId} />
    </div>
  )
}
