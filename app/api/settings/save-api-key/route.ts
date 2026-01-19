import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { spaceId, service, apiKey } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify space ownership
    const { data: space } = await supabase
      .from('spaces')
      .select('id')
      .eq('id', spaceId)
      .eq('user_id', user.id)
      .single()

    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 })
    }

    // Upsert API key
    // NOTE: In production, API keys should be encrypted before storage.
    // Consider using crypto.encrypt() or a service like AWS KMS/Supabase Vault
    const { error } = await supabase
      .from('api_keys')
      .upsert({
        space_id: spaceId,
        service,
        api_key: apiKey, // TODO: Encrypt this in production!
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'space_id,service'
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
