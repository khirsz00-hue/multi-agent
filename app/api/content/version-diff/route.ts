import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { compareVersions } from '@/lib/version-tracking'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { versionId1, versionId2 } = await request.json()
    
    if (!versionId1 || !versionId2) {
      return NextResponse.json(
        { error: 'Both versionId1 and versionId2 are required' },
        { status: 400 }
      )
    }
    
    // Compare versions
    const diff = await compareVersions(versionId1, versionId2)
    
    return NextResponse.json({ diff })
  } catch (error: any) {
    console.error('Version diff error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
