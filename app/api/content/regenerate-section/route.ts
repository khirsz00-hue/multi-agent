import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { versionId, section, instruction } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate section name
    const validSections = ['hook', 'body', 'cta', 'visual_suggestions']
    if (!validSections.includes(section)) {
      return NextResponse.json(
        { error: `Section must be one of: ${validSections.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Get current version with access check
    const { data: currentVersion } = await supabase
      .from('content_versions')
      .select(`
        *,
        content_drafts!inner(
          *,
          agents!inner(
            *,
            spaces!inner(user_id)
          ),
          pain_point:audience_insights(*)
        )
      `)
      .eq('id', versionId)
      .single()
    
    if (!currentVersion || currentVersion.content_drafts.agents.spaces.user_id !== user.id) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }
    
    const draft = currentVersion.content_drafts
    
    // Get brand settings
    const { data: brandSettings } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('space_id', draft.agents.space_id)
      .single()
    
    // Regenerate the specific section
    const newSectionContent = await regenerateSection({
      section,
      instruction,
      currentContent: currentVersion[section],
      otherSections: {
        hook: currentVersion.hook,
        body: currentVersion.body,
        cta: currentVersion.cta,
        visual_suggestions: currentVersion.visual_suggestions
      },
      painPoint: draft.pain_point,
      contentType: draft.content_type,
      brandSettings
    })
    
    // Create new version with only the modified section changed
    const newVersionData: any = {
      draft_id: draft.id,
      is_current: true,
      hook: currentVersion.hook,
      body: currentVersion.body,
      cta: currentVersion.cta,
      visual_suggestions: currentVersion.visual_suggestions,
      modified_sections: [section],
      change_reason: instruction,
      changed_by_ai: true
    }
    
    // Update the specific section
    newVersionData[section] = newSectionContent
    
    const { data: newVersion, error: versionError } = await supabase
      .from('content_versions')
      .insert(newVersionData)
      .select()
      .single()
    
    if (versionError) throw versionError
    
    // Update draft with new current version
    await supabase
      .from('content_drafts')
      .update({ current_version_id: newVersion.id })
      .eq('id', draft.id)
    
    return NextResponse.json({
      success: true,
      version: newVersion
    })
  } catch (error: any) {
    console.error('Section regeneration error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function regenerateSection({
  section,
  instruction,
  currentContent,
  otherSections,
  painPoint,
  contentType,
  brandSettings
}: any) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const systemPrompt = buildSystemPrompt(section, contentType, brandSettings)
  const userPrompt = buildUserPrompt(
    section,
    instruction,
    currentContent,
    otherSections,
    painPoint
  )
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: section === 'visual_suggestions' ? { type: 'json_object' } : undefined
    })
    
    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content generated from OpenAI')
    }
    
    // Parse JSON for visual_suggestions, return text for others
    if (section === 'visual_suggestions') {
      return JSON.parse(content)
    }
    
    return content
  } catch (error: any) {
    console.error('OpenAI regeneration error:', error)
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('Rate limit exceeded. Please try again later.')
    }
    throw error
  }
}

function buildSystemPrompt(section: string, contentType: string, brandSettings: any): string {
  const basePrompt = `You are an expert content creator specializing in creating engaging content about ADHD and neurodiversity.

Brand Voice: ${brandSettings?.brand_voice || 'empathetic, humorous, relatable'}
Target Audience: ${brandSettings?.target_audience || 'People with ADHD, 25-40 years old'}
Guidelines: ${brandSettings?.content_guidelines || 'Focus on lived experience, be authentic'}
`

  const sectionGuidelines: Record<string, string> = {
    hook: `You are refining the HOOK section of a ${contentType}.
The hook is the opening that captures attention and creates curiosity.

For newsletter: Create a compelling section headline (5-10 words)
For deep_post: Create an opening line that stops the scroll (1-2 sentences, under 25 words)

Return ONLY the new hook text (no JSON, no formatting).`,

    body: `You are refining the BODY section of a ${contentType}.
The body is the main content that delivers value and tells the story.

For newsletter: Opening context (2-3 sentences) + detailed exploration (300-500 words) + actionable tips
For deep_post: Personal narrative with setup, conflict, insight, resolution (150-300 words)

Return ONLY the new body text (no JSON, no formatting). Use paragraph breaks for readability.`,

    cta: `You are refining the CTA (Call-to-Action) section of a ${contentType}.
The CTA invites engagement and provides next steps.

For newsletter: Closing with clear next steps, resources, or invitation (2-3 sentences)
For deep_post: Question or prompt that invites comments (1-2 sentences)

Return ONLY the new CTA text (no JSON, no formatting).`,

    visual_suggestions: `You are refining the VISUAL SUGGESTIONS for a ${contentType}.

For newsletter: Formatting, imagery, structure suggestions
For deep_post: Formatting, tone, image_type suggestions

Return JSON with suggested visual elements that would enhance the content.`
  }

  return basePrompt + '\n\n' + (sectionGuidelines[section] || sectionGuidelines.body)
}

function buildUserPrompt(
  section: string,
  instruction: string,
  currentContent: any,
  otherSections: any,
  painPoint: any
): string {
  const context = `
Pain Point Being Addressed: "${painPoint?.pain_point || 'N/A'}"
Category: ${painPoint?.category || 'N/A'}

OTHER SECTIONS (for context, DO NOT modify these):
Hook: "${otherSections.hook}"
Body: "${otherSections.body?.substring(0, 200)}..."
CTA: "${otherSections.cta}"
`

  return `${context}

CURRENT ${section.toUpperCase()}: 
"${typeof currentContent === 'object' ? JSON.stringify(currentContent, null, 2) : currentContent}"

USER INSTRUCTION: ${instruction}

Regenerate ONLY the ${section} section based on the user's instruction. Keep it consistent with the other sections and the overall pain point. Maintain the brand voice and target audience.`
}
