import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const {
      spaceId,
      autoSaveDrafts,
      enableAiSuggestions,
      contentLanguage,
      defaultTextEngine,
      defaultImageEngine,
      defaultVideoTextEngine,
      defaultVideoAvatarEngine
    } = await request.json()
    
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

    // Update or insert settings
    const { error } = await supabase
      .from('space_settings')
      .upsert({
        space_id: spaceId,
        auto_save_drafts: autoSaveDrafts,
        enable_ai_suggestions: enableAiSuggestions,
        content_language: contentLanguage,
        default_text_engine: defaultTextEngine,
        default_image_engine: defaultImageEngine,
        default_video_text_engine: defaultVideoTextEngine,
        default_video_avatar_engine: defaultVideoAvatarEngine,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'space_id'
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
