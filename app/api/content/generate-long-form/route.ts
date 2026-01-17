import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { painPointId, contentType, options } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate content type
    if (!['newsletter', 'deep_post'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Content type must be newsletter or deep_post' },
        { status: 400 }
      )
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
    
    // Generate content with OpenAI
    const sections = await generateLongFormContent({
      painPoint,
      contentType,
      options,
      brandSettings
    })
    
    // Save draft to database
    const { data: draft, error: draftError } = await supabase
      .from('content_drafts')
      .insert({
        agent_id: painPoint.agent_id,
        pain_point_id: painPointId,
        content_type: contentType,
        title: options?.title || `${contentType} - ${new Date().toLocaleDateString()}`,
        tone: options?.tone || 'empathetic',
        goal: options?.goal || 'engagement',
        target_platform: contentType === 'newsletter' ? 'email' : 'instagram',
        status: 'draft'
      })
      .select()
      .single()
    
    if (draftError) throw draftError
    
    // Create initial version with all sections
    const { data: version, error: versionError } = await supabase
      .from('content_versions')
      .insert({
        draft_id: draft.id,
        version_number: 1,
        is_current: true,
        hook: sections.hook,
        body: sections.body,
        cta: sections.cta,
        visual_suggestions: sections.visual_suggestions,
        modified_sections: ['hook', 'body', 'cta', 'visual_suggestions'],
        change_reason: 'Initial generation',
        changed_by_ai: true
      })
      .select()
      .single()
    
    if (versionError) throw versionError
    
    // Update draft with current version reference
    await supabase
      .from('content_drafts')
      .update({ current_version_id: version.id })
      .eq('id', draft.id)
    
    return NextResponse.json({
      success: true,
      draft: {
        ...draft,
        current_version: version
      }
    })
  } catch (error: any) {
    console.error('Long-form content generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function generateLongFormContent({
  painPoint,
  contentType,
  options,
  brandSettings
}: any) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const systemPrompt = buildSystemPrompt(contentType, brandSettings)
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
      throw new Error('Generated content missing required sections')
    }
    
    return {
      hook: parsed.hook,
      body: parsed.body,
      cta: parsed.cta,
      visual_suggestions: parsed.visual_suggestions || {}
    }
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

function buildSystemPrompt(contentType: string, brandSettings: any): string {
  const basePrompt = `You are an expert content creator specializing in creating engaging long-form content about ADHD and neurodiversity.

Brand Voice: ${brandSettings?.brand_voice || 'empathetic, humorous, relatable'}
Target Audience: ${brandSettings?.target_audience || 'People with ADHD, 25-40 years old'}
Guidelines: ${brandSettings?.content_guidelines || 'Focus on lived experience, be authentic'}
`

  const formatPrompts: Record<string, string> = {
    newsletter: `Create a newsletter section with depth and educational value.

Return JSON with these sections:
{
  "hook": "Compelling section headline that stops readers (5-10 words)",
  "body": "Opening paragraph that sets context (2-3 sentences) + detailed exploration with personal narrative or research (300-500 words) + actionable tips or framework (numbered list or bullets)",
  "cta": "Closing with clear next steps, resources, or invitation to engage (2-3 sentences)",
  "visual_suggestions": {
    "formatting": "Suggested formatting like headers, bullet points, emphasis",
    "imagery": "Description of accompanying image or graphic that would enhance the content",
    "structure": "Recommended section breaks or visual flow"
  }
}`,

    deep_post: `Create a thoughtful, story-driven social media post with emotional depth.

Return JSON with these sections:
{
  "hook": "Opening line that stops the scroll and creates curiosity (1-2 sentences, under 25 words)",
  "body": "Personal narrative or relatable scenario with vulnerability and authenticity. Include: setup, conflict/struggle, insight/realization, resolution. Use paragraph breaks for readability. (150-300 words)",
  "cta": "Question or prompt that invites comments and sharing. Make it specific and personal. (1-2 sentences)",
  "visual_suggestions": {
    "formatting": "Emoji placement, line breaks, emphasis points",
    "tone": "Visual aesthetic (e.g., raw, polished, casual)",
    "image_type": "Suggested accompanying image (e.g., personal photo, quote graphic, carousel format)"
  }
}`
  }

  return basePrompt + '\n\n' + (formatPrompts[contentType] || formatPrompts.deep_post)
}

function buildUserPrompt(painPoint: any, options: any): string {
  return `Create ${options?.tone || 'empathetic'} content with a ${options?.goal || 'engagement'} goal.

Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}
Frequency: ${painPoint.frequency}
Example Quote: "${painPoint.raw_content || 'N/A'}"

${options?.additionalNotes ? `Additional Instructions: ${options.additionalNotes}` : ''}

Generate engaging, valuable content that resonates deeply with the target audience. Focus on providing real value and creating emotional connection.`
}
