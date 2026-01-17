import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { validateReelScenario, calculateQualityScore } from '@/lib/reel-validator'

export async function POST(request: Request) {
  try {
    const { painPointId, options } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get pain point with agent access check
    const { data: painPoint } = await supabase
      .from('audience_insights')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', painPointId)
      .single()
    
    if (!painPoint || painPoint.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Pain point not found' }, { status: 404 })
    }
    
    // Get brand settings (optional)
    const { data: brandSettings } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('space_id', painPoint.agents.space_id)
      .single()
    
    // Generate draft scenario with OpenAI
    const draftScenario = await generateDraftScenario({
      painPoint,
      options,
      brandSettings
    })
    
    // Validate the generated scenario
    const validation = validateReelScenario(draftScenario)
    const qualityScore = calculateQualityScore(draftScenario, validation)
    
    // Save draft to database
    const { data: draft, error } = await supabase
      .from('draft_reel_scenarios')
      .insert({
        agent_id: painPoint.agent_id,
        pain_point_id: painPointId,
        draft_scenario: draftScenario,
        original_scenario: draftScenario, // Keep original for comparison
        tone: options?.tone || 'empathetic',
        goal: options?.goal || 'engagement',
        status: 'draft',
        validation_results: validation,
        estimated_quality_score: qualityScore
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true, 
      draft,
      validation,
      qualityScore
    })
  } catch (error: any) {
    console.error('Draft reel generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function generateDraftScenario({ painPoint, options, brandSettings }: any) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const systemPrompt = buildSystemPrompt(brandSettings)
  const userPrompt = buildUserPrompt(painPoint, options)
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })
    
    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content generated from OpenAI')
    }
    
    const parsed = JSON.parse(content)
    
    // Validate required fields exist
    if (!parsed.hook || !parsed.body || !parsed.cta) {
      throw new Error('Generated content missing required fields (hook, body, cta)')
    }
    
    return parsed
  } catch (error: any) {
    console.error('OpenAI generation error:', error)
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('Rate limit exceeded. Please try again later.')
    } else if (error instanceof SyntaxError) {
      throw new Error('Invalid response format from AI')
    }
    throw error
  }
}

function buildSystemPrompt(brandSettings: any): string {
  return `You are an expert Instagram Reel/TikTok content creator specializing in creating engaging video content about ADHD and neurodiversity.

Brand Voice: ${brandSettings?.brand_voice || 'empathetic, humorous, relatable'}
Target Audience: ${brandSettings?.target_audience || 'People with ADHD, 25-40 years old'}
Guidelines: ${brandSettings?.content_guidelines || 'Focus on lived experience, be authentic'}

Create a detailed reel scenario that can be edited before final production.

CRITICAL: Return ONLY valid JSON with this exact structure:
{
  "hook": "Attention-grabbing first 3 seconds (30-150 chars, 6-30 words)",
  "body": "Main content with clear structure and storytelling",
  "cta": "Call to action that drives engagement (question works best)",
  "key_moments": [
    {
      "timing": "0-3s",
      "description": "Hook - grab attention",
      "text": "Opening text or voiceover"
    },
    {
      "timing": "3-15s",
      "description": "Main point - core message",
      "text": "Main content text or voiceover"
    },
    {
      "timing": "15-30s",
      "description": "CTA - call to action",
      "text": "Closing text or voiceover"
    }
  ],
  "visual_suggestions": {
    "format": "talking head / b-roll / text overlay / mixed",
    "music_vibe": "upbeat / emotional / trending / calm"
  },
  "hashtags": ["adhd", "neurodiversity", "relatable", "mental_health", "adhd_life"]
}

Make it scroll-stopping, relatable, and authentic. The hook MUST grab attention in 3 seconds.`
}

function buildUserPrompt(painPoint: any, options: any): string {
  return `Create a ${options?.tone || 'empathetic'} reel with a ${options?.goal || 'engagement'} goal.

Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}
Frequency: ${painPoint.frequency}
Example Quote: "${painPoint.raw_content || 'N/A'}"

${options?.additionalNotes ? `Additional Instructions: ${options.additionalNotes}` : ''}

Generate a compelling reel scenario that resonates with the target audience and addresses this pain point authentically.`
}
