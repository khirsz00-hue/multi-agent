import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { draftId } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch draft with access check
    const { data: draft, error: draftError } = await supabase
      .from('content_drafts')
      .select('*, agents!inner(space_id, spaces!inner(user_id))')
      .eq('id', draftId)
      .single()
    
    if (draftError || !draft || draft.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    
    // Analyze content for video recommendation
    const recommendation = await analyzeForVideoFormat(draft)
    
    // Save recommendation to database
    await supabase
      .from('content_drafts')
      .update({ ai_video_recommendation: recommendation })
      .eq('id', draftId)
    
    return NextResponse.json({ success: true, recommendation })
  } catch (error: any) {
    console.error('Video recommendation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function analyzeForVideoFormat(draft: any) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: `You are a social media video strategist. Analyze content and recommend the best video format.

Available formats:
1. TEXT-ONLY (text overlays + animations)
   - Best for: POV content, memes, quick tips, humorous/viral content
   - Fast, cheap, high engagement
   - Engines: Remotion, Creatomate

2. TALKING HEAD (avatar with lip-sync)
   - Best for: Educational, storytelling, building trust, longer content
   - More expensive, builds personal connection
   - Engines: D-ID, HeyGen

Analyze based on:
- content_type (reel/meme/deep_post/etc)
- tone (humorous/empathetic/educational)
- goal (viral/engagement/education)
- length (short/medium/long)
- sentiment

Return JSON:
{
  "recommended_type": "text_only" or "talking_head",
  "recommended_engine": "remotion" or "d-id",
  "text_only_score": 0-100,
  "talking_head_score": 0-100,
  "reasoning": "Clear explanation why this format works best",
  "key_factors": ["factor1", "factor2"],
  "estimated_cost": 0.10,
  "estimated_time_seconds": 60
}`
      },
      {
        role: 'user',
        content: `Analyze this content:

Content Type: ${draft.content_type}
Tone: ${draft.tone || 'N/A'}
Goal: ${draft.goal || 'N/A'}
Hook: "${draft.hook || ''}"
Body Length: ${draft.body?.length || 0} characters
Platform: ${draft.target_platform || 'instagram'}

Recommend the best video format.`
      }
    ],
    response_format: { type: 'json_object' }
  })
  
  const result = JSON.parse(completion.choices[0].message.content || '{}')
  
  return {
    recommended_type: result.recommended_type || 'text_only',
    recommended_engine: result.recommended_engine || 'remotion',
    text_only_score: result.text_only_score || 50,
    talking_head_score: result.talking_head_score || 50,
    reasoning: result.reasoning || 'Analysis complete',
    key_factors: result.key_factors || [],
    estimated_cost: result.estimated_cost || 0.10,
    estimated_time_seconds: result.estimated_time_seconds || 60
  }
}
