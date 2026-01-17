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
1. TEXT-ONLY (text overlays + animations + background footage)
   - Best for: POV content, memes, quick tips, humorous/viral content, short punchy messages
   - Strengths: Fast production, high engagement, works for scrollers, trendy
   - Ideal length: 7-20 seconds
   - Cost: $0.10-0.20 per video
   - Engines: Remotion (custom), Creatomate (templates)

2. TALKING HEAD (avatar with lip-sync voice)
   - Best for: Educational content, storytelling, building trust, longer explanations, personal connection
   - Strengths: Authenticity, credibility, detailed explanations
   - Ideal length: 30-90 seconds
   - Cost: $0.30-1.00 per video
   - Engines: D-ID (budget), HeyGen (premium)

Analyze based on:
- content_type: reel = lean text-only, deep_post = lean talking head
- tone: humorous/viral → text-only, educational/empathetic → talking head
- goal: viral/engagement → text-only, education/trust → talking head
- body length: <200 chars → text-only, >300 chars → talking head
- sentiment: frustrated/relatable → text-only, seeking help → talking head

Return ONLY valid JSON (no markdown):
{
  "recommended_type": "text_only" or "talking_head",
  "recommended_engine": "remotion" or "d-id",
  "text_only_score": 0-100,
  "talking_head_score": 0-100,
  "reasoning": "1-2 sentence clear explanation",
  "key_factors": ["factor1", "factor2", "factor3"],
  "estimated_cost": 0.10,
  "estimated_time_seconds": 60
}`
      },
      {
        role: 'user',
        content: `Analyze this content draft:

Content Type: ${draft.content_type || 'reel'}
Tone: ${draft.tone || 'empathetic'}
Goal: ${draft.goal || 'engagement'}
Hook: "${draft.hook || ''}"
Body: "${draft.body || ''}"
Body Length: ${(draft.body || '').length} characters
CTA: "${draft.cta || ''}"

Recommend the best video format with scores and reasoning.`
      }
    ],
    response_format: { type: 'json_object' }
  })
  
  const result = JSON.parse(completion.choices[0].message.content || '{}')
  
  // Validate and return
  return {
    recommended_type: result.recommended_type || 'text_only',
    recommended_engine: result.recommended_engine || 'remotion',
    text_only_score: result.text_only_score || 50,
    talking_head_score: result.talking_head_score || 50,
    reasoning: result.reasoning || 'Analysis complete',
    key_factors: result.key_factors || [],
    estimated_cost: result.estimated_cost || 0.15,
    estimated_time_seconds: result.estimated_time_seconds || 60
  }
}
