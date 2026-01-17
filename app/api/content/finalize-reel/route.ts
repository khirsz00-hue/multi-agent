import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { type ReelScenario } from '@/lib/reel-validator'

export async function POST(request: Request) {
  try {
    const { draftId } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get draft scenario with access check
    const { data: draftScenario } = await supabase
      .from('draft_reel_scenarios')
      .select('*, agents!inner(*, spaces!inner(user_id))')
      .eq('id', draftId)
      .single()
    
    if (!draftScenario || draftScenario.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    
    if (draftScenario.status === 'finalized') {
      return NextResponse.json({ error: 'Draft already finalized' }, { status: 400 })
    }
    
    // Get brand settings
    const { data: brandSettings } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('space_id', draftScenario.agents.space_id)
      .single()
    
    // Generate final optimized reel from edited scenario
    const finalReel = await optimizeReelScenario({
      scenario: draftScenario.draft_scenario,
      originalScenario: draftScenario.original_scenario,
      editHistory: draftScenario.edit_history,
      brandSettings,
      tone: draftScenario.tone,
      goal: draftScenario.goal
    })
    
    // Save final reel to content_drafts
    const { data: finalDraft, error: draftError } = await supabase
      .from('content_drafts')
      .insert({
        agent_id: draftScenario.agent_id,
        pain_point_id: draftScenario.pain_point_id,
        content_type: 'reel',
        hook: finalReel.hook,
        body: finalReel.body,
        cta: finalReel.cta,
        hashtags: finalReel.hashtags,
        visual_suggestions: finalReel.visual_suggestions,
        tone: draftScenario.tone,
        goal: draftScenario.goal,
        target_platform: 'instagram',
        status: 'ready'
      })
      .select()
      .single()
    
    if (draftError) throw draftError
    
    // Update draft scenario status
    const { error: updateError } = await supabase
      .from('draft_reel_scenarios')
      .update({
        status: 'finalized',
        final_draft_id: finalDraft.id
      })
      .eq('id', draftId)
    
    if (updateError) throw updateError
    
    return NextResponse.json({ 
      success: true, 
      finalDraft,
      message: 'Reel finalized successfully!'
    })
  } catch (error: any) {
    console.error('Finalize reel error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function optimizeReelScenario({
  scenario,
  originalScenario,
  editHistory,
  brandSettings,
  tone,
  goal
}: {
  scenario: ReelScenario
  originalScenario: ReelScenario
  editHistory: any[]
  brandSettings: any
  tone: string
  goal: string
}) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  // Build optimization prompt
  const systemPrompt = `You are an expert reel optimizer. Your job is to take a user-edited reel scenario and polish it for maximum impact while preserving the user's edits.

Brand Voice: ${brandSettings?.brand_voice || 'empathetic, humorous, relatable'}
Target Audience: ${brandSettings?.target_audience || 'People with ADHD, 25-40 years old'}

CRITICAL: Return ONLY valid JSON with this structure:
{
  "hook": "Optimized hook (preserve user's main intent)",
  "body": "Optimized body (preserve user's main points)",
  "cta": "Optimized CTA (preserve user's call to action)",
  "hashtags": ["optimized", "hashtags"],
  "visual_suggestions": {
    "format": "format recommendation",
    "music_vibe": "music vibe",
    "key_moments": ["moment 1 at 0-3s", "moment 2 at 3-15s", "moment 3 at 15-30s"]
  },
  "optimization_notes": "Brief explanation of what was optimized"
}`

  const userPrompt = `Optimize this reel scenario. The user has edited it ${editHistory?.length || 0} times.

CURRENT SCENARIO (user-edited):
Hook: ${scenario.hook}
Body: ${scenario.body}
CTA: ${scenario.cta}
Key Moments: ${JSON.stringify(scenario.key_moments)}
Visual: ${JSON.stringify(scenario.visual_suggestions)}
Hashtags: ${scenario.hashtags?.join(', ')}

ORIGINAL AI SCENARIO:
Hook: ${originalScenario.hook}
Body: ${originalScenario.body}
CTA: ${originalScenario.cta}

Tone: ${tone}
Goal: ${goal}

Optimize for ${goal} while preserving the user's edits and intent. Make minor improvements to:
- Strengthen emotional impact
- Improve flow and pacing
- Enhance clarity
- Optimize hashtags for discoverability
- Fine-tune visual suggestions

DO NOT drastically change the user's edits. Respect their creative direction.`

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
      // Fallback to user's scenario if optimization fails
      return scenario
    }
    
    const optimized = JSON.parse(content)
    
    // Ensure all required fields exist
    return {
      hook: optimized.hook || scenario.hook,
      body: optimized.body || scenario.body,
      cta: optimized.cta || scenario.cta,
      hashtags: optimized.hashtags || scenario.hashtags,
      visual_suggestions: optimized.visual_suggestions || scenario.visual_suggestions
    }
  } catch (error: any) {
    console.error('Optimization error:', error)
    // Return user's scenario as-is if optimization fails
    return scenario
  }
}
