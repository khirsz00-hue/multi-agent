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
      .select('*, agents(space_id, spaces(user_id)), pain_point:pain_point_id(sentiment)')
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
  
  const bodyLength = draft.body?.length || 0
  const sentiment = draft.pain_point?.sentiment || 'N/A'
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: `You are a social media video strategist. Analyze content and recommend the best video format.

Available formats:
1. TEXT-ONLY (text overlays + animations)
   - Best for: POV content, memes, quick tips, humorous/viral content
   - Engines: Remotion (recommended, $0.10), Creatomate ($0.15)
   - Pros: Fast, cheap, high engagement for short content
   - Cons: Less personal connection

2. TALKING HEAD (avatar with lip-sync)
   - Best for: Educational, storytelling, building trust, longer content
   - Engines: D-ID ($0.30), HeyGen ($1.00)
   - Pros: Personal, builds trust, good for complex topics
   - Cons: More expensive, slower

Analyze these factors:
- content_type: reel/meme → text-only, deep_post/newsletter → talking head
- tone: humorous/controversial → text-only, empathetic/educational → talking head
- goal: viral → text-only, education/trust → talking head
- length: <150 chars → text-only, >300 chars → talking head
- sentiment: frustrated/relatable → text-only, seeking_help → talking head

Return JSON:
{
  "recommended_type": "text_only" or "talking_head",
  "recommended_engine": "remotion" | "creatomate" | "d-id" | "heygen",
  "text_only_score": 0-100,
  "talking_head_score": 0-100,
  "reasoning": "2-3 sentence explanation",
  "key_factors": ["factor1", "factor2", "factor3"],
  "estimated_cost": 0.10,
  "estimated_time_seconds": 60
}`
      },
      {
        role: 'user',
        content: `Analyze this content draft:

Content Type: ${draft.content_type}
Tone: ${draft.tone || 'empathetic'}
Goal: ${draft.goal || 'engagement'}
Hook: "${draft.hook || ''}"
Body Length: ${bodyLength} characters
Sentiment: ${sentiment}

Recommend the best video format and engine.`
      }
    ],
    response_format: { type: 'json_object' }
  })
  
  const result = JSON.parse(completion.choices[0].message.content || '{}')
  
  // Add timestamp
  result.analyzed_at = new Date().toISOString()
  
  return result
}
