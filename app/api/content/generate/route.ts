import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { validateReelScenario, calculateQualityScore } from '@/lib/reel-validator'

const STATIC_CONTENT_TYPES = ['meme', 'post', 'deep_post', 'engagement_post', 'newsletter', 'thread']
const VIDEO_CONTENT_TYPES = ['reel', 'short_form']
const IMAGE_ENGINES = ['dalle', 'google_ai', 'replicate'] as const
const VIDEO_ENGINES = ['runway', 'pika'] as const
const DEFAULT_IMAGE_ENGINE = 'dalle'
const DEFAULT_VIDEO_ENGINE = 'runway'

type ImageEngine = typeof IMAGE_ENGINES[number]
type VideoEngine = typeof VIDEO_ENGINES[number]

interface ContentOptions {
  tone?: string
  goal?: string
  platform?: string
  additionalNotes?: string
}

/**
 * PainPoint structure as returned from Supabase query with joined relations
 * Query: .select('*, agents!inner(*, spaces!inner(user_id))')
 * This includes both the direct agent_id field and the joined agents object
 */
interface PainPoint {
  id: string
  pain_point: string
  category: string
  sentiment: string
  frequency: string
  raw_content?: string
  agent_id: string
  agents: {
    id: string
    space_id: string
    spaces: {
      user_id: string
    }
  }
}

interface BrandSettings {
  brand_voice?: string
  target_audience?: string
  content_guidelines?: string
}

interface User {
  id: string
  email?: string
}

interface SupabaseClient {
  auth: {
    getUser: () => Promise<{ data: { user: User | null } }>
  }
  from: (table: string) => any
  storage: any
}

interface VisualSuggestions {
  format?: string
  music_vibe?: string
  meme_format?: string
  image_description?: string
  formatting?: string
  engagement_type?: string
  key_moments?: string[]
}

interface GenerationContext {
  supabase: SupabaseClient
  painPoint: PainPoint
  contentType: string
  options?: ContentOptions
  brandSettings?: BrandSettings
  agentId: string
  painPointId: string
  user: User
}

interface StaticGenerationContext extends GenerationContext {
  imageEngine: ImageEngine
}

interface VideoGenerationContext extends GenerationContext {
  videoEngine: VideoEngine
}

interface MemeConcept {
  meme_format: string
  top_text: string
  bottom_text: string
  hook: string
  cta: string
  hashtags: string[]
  image_description: string
}

interface GeneratedContent {
  hook?: string
  body?: string
  cta?: string
  hashtags?: string[]
  visual_suggestions?: VisualSuggestions
}

interface ImageGenerationResult {
  imageBuffer: Buffer
  model: string
  engine: string
}

interface GenerationResponse {
  type: 'static' | 'video'
  status: 'completed' | 'processing'
  engine?: string
  image_url?: string
  video_url?: string
  scenario_id?: string // For video: draft scenario ID
  task_id?: string // For video: actual video generation task ID (future)
  message?: string
  error?: string
}

interface StaticGenerationResponse {
  success: boolean
  draft: any
  generation: GenerationResponse
}

interface VideoGenerationResponse {
  success: boolean
  draft: any
  generation: GenerationResponse
}

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const { painPointId, contentType, options, imageEngine, videoEngine } = await request.json()
    
    console.log(`[Content Generation] Starting request - contentType: ${contentType}, imageEngine: ${imageEngine || 'auto'}, videoEngine: ${videoEngine || 'auto'}`)
    
    // Comprehensive input validation
    if (!painPointId || typeof painPointId !== 'string') {
      return NextResponse.json({ error: 'Invalid painPointId' }, { status: 400 })
    }
    
    if (!contentType || typeof contentType !== 'string') {
      return NextResponse.json({ error: 'Invalid contentType' }, { status: 400 })
    }
    
    const isStaticContent = STATIC_CONTENT_TYPES.includes(contentType)
    const isVideoContent = VIDEO_CONTENT_TYPES.includes(contentType)
    
    if (!isStaticContent && !isVideoContent) {
      return NextResponse.json({ 
        error: `Invalid contentType. Must be one of: ${[...STATIC_CONTENT_TYPES, ...VIDEO_CONTENT_TYPES].join(', ')}` 
      }, { status: 400 })
    }
    
    // Validate engines if provided
    if (imageEngine && !IMAGE_ENGINES.includes(imageEngine)) {
      return NextResponse.json({ 
        error: `Invalid imageEngine. Must be one of: ${IMAGE_ENGINES.join(', ')}` 
      }, { status: 400 })
    }
    
    if (videoEngine && !VIDEO_ENGINES.includes(videoEngine)) {
      return NextResponse.json({ 
        error: `Invalid videoEngine. Must be one of: ${VIDEO_ENGINES.join(', ')}` 
      }, { status: 400 })
    }
    
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
    
    const agentId = painPoint.agents.id
    const spaceId = painPoint.agents.space_id
    
    // Get brand settings (optional)
    const { data: brandSettings } = await supabase
      .from('brand_settings')
      .select('*')
      .eq('space_id', spaceId)
      .single()
    
    console.log(`[Content Generation] Routing decision - type: ${isVideoContent ? 'video' : 'static'}`)
    
    // Route to appropriate generation logic
    if (isVideoContent) {
      const result = await handleVideoGeneration({
        supabase,
        painPoint,
        contentType,
        options,
        brandSettings,
        agentId,
        painPointId,
        videoEngine: videoEngine || DEFAULT_VIDEO_ENGINE,
        user
      })
      
      const duration = Date.now() - startTime
      console.log(`[Content Generation] Video generation completed in ${duration}ms`)
      
      return NextResponse.json(result)
    } else {
      const result = await handleStaticGeneration({
        supabase,
        painPoint,
        contentType,
        options,
        brandSettings,
        agentId,
        painPointId,
        imageEngine: imageEngine || DEFAULT_IMAGE_ENGINE,
        user
      })
      
      const duration = Date.now() - startTime
      console.log(`[Content Generation] Static generation completed in ${duration}ms`)
      
      return NextResponse.json(result)
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[Content Generation] Error after ${duration}ms:`, error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate content' 
    }, { status: 500 })
  }
}

/**
 * Handle static content generation (meme, post, deep_post, engagement_post, newsletter, thread)
 */
async function handleStaticGeneration({
  supabase, 
  painPoint, 
  contentType, 
  options, 
  brandSettings,
  agentId,
  painPointId,
  imageEngine,
  user
}: StaticGenerationContext): Promise<StaticGenerationResponse> {
  const isMeme = contentType === 'meme'
  
  console.log(`[Static Generation] Generating ${contentType}${isMeme ? ` with ${imageEngine} engine` : ''}`)
  
  // Generate content with OpenAI
  let draftData: any
  
  if (isMeme) {
    const memeConcept = await generateMemeConcept({ painPoint, options, brandSettings })
    draftData = {
      agent_id: agentId,
      pain_point_id: painPointId,
      content_type: contentType,
      hook: memeConcept.hook,
      body: `Top: ${memeConcept.top_text}\n\nBottom: ${memeConcept.bottom_text}`,
      cta: memeConcept.cta,
      hashtags: memeConcept.hashtags || [],
      tone: options?.tone || 'humorous',
      goal: options?.goal || 'viral',
      target_platform: getDefaultPlatform(contentType),
      visual_suggestions: {
        meme_format: memeConcept.meme_format,
        image_description: memeConcept.image_description
      },
      status: 'draft',
      // Store top_text and bottom_text separately for reliable extraction
      _meme_top_text: memeConcept.top_text,
      _meme_bottom_text: memeConcept.bottom_text
    }
  } else {
    const content = await generateContent({ painPoint, contentType, options, brandSettings })
    draftData = {
      agent_id: agentId,
      pain_point_id: painPointId,
      content_type: contentType,
      ...content,
      tone: options?.tone || 'empathetic',
      goal: options?.goal || 'engagement',
      target_platform: options?.platform || getDefaultPlatform(contentType)
    }
  }
  
  // Save draft to database
  const { data: draft, error: draftError } = await supabase
    .from('content_drafts')
    .insert(draftData)
    .select()
    .single()
  
  if (draftError) throw draftError
  
  const response: StaticGenerationResponse = {
    success: true,
    draft,
    generation: {
      type: 'static',
      status: 'completed'
    }
  }
  
  // Generate image for meme
  if (isMeme) {
    console.log(`[Static Generation] Generating meme image with ${imageEngine}`)
    
    // Extract meme concept from draft data (using stored separate fields if available)
    const topText = draftData._meme_top_text || draftData.body.split('\n')[0]?.replace('Top: ', '') || ''
    const bottomText = draftData._meme_bottom_text || draftData.body.split('\n')[2]?.replace('Bottom: ', '') || ''
    
    const memeConcept: MemeConcept = {
      meme_format: draftData.visual_suggestions.meme_format,
      top_text: topText,
      bottom_text: bottomText,
      image_description: draftData.visual_suggestions.image_description,
      hook: draftData.hook,
      cta: draftData.cta,
      hashtags: draftData.hashtags
    }
    
    try {
      const imageData = await generateMemeImage({
        concept: memeConcept,
        options,
        engine: imageEngine
      })
      
      // Upload to storage
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(7)
      const storagePath = `${user.id}/memes/${timestamp}-${randomId}.png`
      
      const supabaseAdmin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { error: storageError } = await supabaseAdmin.storage
        .from('meme-images')
        .upload(storagePath, imageData.imageBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        })
      
      if (storageError) throw storageError
      
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('meme-images')
        .getPublicUrl(storagePath)
      
      // Save meme metadata
      const { data: memeImage } = await supabase
        .from('meme_images')
        .insert({
          content_draft_id: draft.id,
          agent_id: agentId,
          original_prompt: memeConcept.image_description,
          meme_format: memeConcept.meme_format,
          top_text: memeConcept.top_text,
          bottom_text: memeConcept.bottom_text,
          image_url: publicUrl,
          storage_path: storagePath,
          version: 1,
          parent_version_id: null,
          refinement_prompt: null,
          raw_image_data: {
            generated_at: new Date().toISOString(),
            model: imageData.model,
            engine: imageData.engine,
            concept: memeConcept
          }
        })
        .select()
        .single()
      
      // Link to draft
      await supabase
        .from('content_drafts')
        .update({ meme_image_id: memeImage.id })
        .eq('id', draft.id)
      
      response.generation.engine = imageData.engine
      response.generation.image_url = publicUrl
      response.draft.meme_image_id = memeImage.id
      
      console.log(`[Static Generation] Meme image generated and saved successfully`)
    } catch (imageError: any) {
      console.error(`[Static Generation] Image generation failed:`, imageError)
      // Don't fail the entire request if image generation fails
      response.generation.error = imageError.message
    }
  }
  
  return response
}

/**
 * Handle video content generation (reel, short_form)
 */
async function handleVideoGeneration({
  supabase,
  painPoint,
  contentType,
  options,
  brandSettings,
  agentId,
  painPointId,
  videoEngine,
  user
}: VideoGenerationContext): Promise<VideoGenerationResponse> {
  console.log(`[Video Generation] Generating ${contentType} scenario with ${videoEngine} engine`)
  
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
      agent_id: agentId,
      pain_point_id: painPointId,
      draft_scenario: draftScenario,
      original_scenario: draftScenario,
      tone: options?.tone || 'empathetic',
      goal: options?.goal || 'engagement',
      status: 'draft',
      validation_results: validation,
      estimated_quality_score: qualityScore
    })
    .select()
    .single()
  
  if (error) throw error
  
  console.log(`[Video Generation] Scenario saved, video generation not yet implemented`)
  
  return {
    success: true,
    draft,
    generation: {
      type: 'video',
      engine: videoEngine,
      status: 'processing',
      scenario_id: `draft-${draft.id}`, // Draft scenario ID, not a video processing task ID
      message: 'Video scenario created. Actual video generation can be triggered separately.'
    }
  }
}

async function generateContent({ 
  painPoint, 
  contentType, 
  options, 
  brandSettings 
}: {
  painPoint: PainPoint
  contentType: string
  options?: ContentOptions
  brandSettings?: BrandSettings
}): Promise<GeneratedContent> {
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
    if (!parsed.hook && !parsed.body) {
      throw new Error('Generated content missing required fields')
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

/**
 * Generate meme concept using OpenAI
 */
async function generateMemeConcept({ 
  painPoint, 
  options, 
  brandSettings 
}: {
  painPoint: PainPoint
  options?: ContentOptions
  brandSettings?: BrandSettings
}): Promise<MemeConcept> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const systemPrompt = `You are an expert meme creator specializing in relatable, engaging memes about ADHD and neurodiversity.

Brand Voice: ${brandSettings?.brand_voice || 'humorous, empathetic, relatable'}
Target Audience: ${brandSettings?.target_audience || 'People with ADHD, 25-40 years old'}

Create a meme concept that is funny, relatable, and scroll-stopping.

Return JSON with this exact structure:
{
  "meme_format": "Name of meme format or 'Custom'",
  "top_text": "Setup text (keep short, 5-10 words max)",
  "bottom_text": "Punchline text (keep short, 5-10 words max)",
  "hook": "Instagram caption hook",
  "cta": "Call to action for comments",
  "hashtags": ["adhd", "relatable", "meme"],
  "image_description": "Detailed visual description for AI image generation (be specific about composition, colors, style, text placement)"
}`

  const userPrompt = `Create a ${options?.tone || 'humorous'} meme for ${options?.goal || 'viral'} engagement.

Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}

Make it relatable, funny, and shareable. The image should be eye-catching and work well on Instagram.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8
    })
    
    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content generated from OpenAI')
    }
    
    const parsed = JSON.parse(content)
    
    // Validate required fields
    if (!parsed.top_text || !parsed.bottom_text || !parsed.image_description) {
      throw new Error('Generated meme concept missing required fields')
    }
    
    return parsed
  } catch (error: any) {
    console.error('OpenAI meme concept generation error:', error)
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('Rate limit exceeded. Please try again later.')
    }
    throw error
  }
}

/**
 * Generate meme image with fallback to DALL-E
 */
async function generateMemeImage({ 
  concept, 
  options, 
  engine 
}: {
  concept: MemeConcept
  options?: ContentOptions
  engine: ImageEngine
}): Promise<ImageGenerationResult> {
  console.log(`[Image Generation] Attempting with engine: ${engine}`)
  
  // Engine availability registry
  const engineAvailable: Record<ImageEngine, boolean> = {
    'dalle': true,
    'google_ai': false,
    'replicate': false
  }
  
  // If requested engine is available, use it
  if (engineAvailable[engine]) {
    if (engine === 'dalle') {
      return await generateWithDallE(concept, options)
    }
    // Add future engine implementations here
  }
  
  // Engine not implemented, fallback to DALL-E
  if (!engineAvailable[engine]) {
    console.log(`[Image Generation] Engine ${engine} not yet implemented, falling back to DALL-E`)
    return await generateWithDallE(concept, options)
  }
  
  // Fallback for any other case
  console.log(`[Image Generation] Unexpected engine state for ${engine}, falling back to DALL-E`)
  return await generateWithDallE(concept, options)
}

/**
 * Generate image using DALL-E 3
 */
async function generateWithDallE(
  concept: MemeConcept, 
  options?: ContentOptions
): Promise<ImageGenerationResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const imagePrompt = `Create a ${concept.meme_format !== 'Custom' ? concept.meme_format + ' style' : ''} meme image.

Visual Description: ${concept.image_description}

Text to include:
- Top: "${concept.top_text}"
- Bottom: "${concept.bottom_text}"

Style: Modern meme aesthetic, bold sans-serif font (Impact or similar), white text with black stroke, high contrast, social media optimized. Square format (1024x1024).`

  console.log('[DALL-E 3] Generating image with prompt')
  
  try {
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json'
    })
    
    if (!imageResponse.data?.[0]?.b64_json) {
      throw new Error('No image data returned from DALL-E 3')
    }
    
    console.log('[DALL-E 3] Image generated successfully')
    
    return {
      imageBuffer: Buffer.from(imageResponse.data[0].b64_json, 'base64'),
      model: 'dall-e-3',
      engine: 'dalle'
    }
  } catch (error: any) {
    console.error('[DALL-E 3] Generation error:', error)
    
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('DALL-E 3 rate limit exceeded. Please try again later.')
    }
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI quota exceeded. Please check your account.')
    }
    if (error.status === 400) {
      throw new Error(`DALL-E 3 rejected the prompt: ${error.message}`)
    }
    
    throw new Error(`Failed to generate image with DALL-E 3: ${error.message}`)
  }
}

/**
 * Generate draft reel scenario
 */
async function generateDraftScenario({ 
  painPoint, 
  options, 
  brandSettings 
}: {
  painPoint: PainPoint
  options?: ContentOptions
  brandSettings?: BrandSettings
}) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const systemPrompt = buildReelSystemPrompt(brandSettings)
  const userPrompt = buildReelUserPrompt(painPoint, options)
  
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
    
    if (!parsed.hook || !parsed.body || !parsed.cta) {
      throw new Error('Generated content missing required fields (hook, body, cta)')
    }
    
    return parsed
  } catch (error: any) {
    console.error('OpenAI reel scenario generation error:', error)
    if (error.code === 'rate_limit_exceeded') {
      throw new Error('Rate limit exceeded. Please try again later.')
    } else if (error instanceof SyntaxError) {
      throw new Error('Invalid response format from AI')
    }
    throw error
  }
}

function buildReelSystemPrompt(brandSettings?: BrandSettings): string {
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

function buildReelUserPrompt(painPoint: PainPoint, options?: ContentOptions): string {
  return `Create a ${options?.tone || 'empathetic'} reel with a ${options?.goal || 'engagement'} goal.

Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}
Frequency: ${painPoint.frequency}
Example Quote: "${painPoint.raw_content || 'N/A'}"

${options?.additionalNotes ? `Additional Instructions: ${options.additionalNotes}` : ''}

Generate a compelling reel scenario that resonates with the target audience and addresses this pain point authentically.`
}

function buildSystemPrompt(contentType: string, brandSettings?: BrandSettings): string {
  const basePrompt = `You are an expert social media content creator specializing in creating engaging content about ADHD and neurodiversity.

Brand Voice: ${brandSettings?.brand_voice || 'empathetic, humorous, relatable'}
Target Audience: ${brandSettings?.target_audience || 'People with ADHD, 25-40 years old'}
Guidelines: ${brandSettings?.content_guidelines || 'Focus on lived experience, be authentic'}
`

  const formatPrompts: Record<string, string> = {
    reel: `Create an Instagram Reel/TikTok script (15-60 seconds).

Return JSON:
{
  "hook": "Attention-grabbing first 3 seconds",
  "body": "Main content with clear structure",
  "cta": "Call to action that drives engagement",
  "hashtags": ["relevant", "hashtags"],
  "visual_suggestions": {
    "format": "talking head / b-roll / text overlay",
    "music_vibe": "upbeat / emotional / trending",
    "key_moments": ["moment 1 at 0-3s", "moment 2 at 3-15s"]
  }
}`,

    meme: `Create a relatable meme concept.

Return JSON:
{
  "hook": "Meme format name (e.g., Drake meme)",
  "body": "Top text: [setup]\n\nBottom text: [punchline]",
  "cta": "Instagram caption to accompany meme",
  "hashtags": ["relevant", "hashtags"],
  "visual_suggestions": {
    "meme_format": "Drake / Distracted Boyfriend / Custom",
    "image_description": "Detailed description of what image should show"
  }
}`,

    deep_post: `Create a thoughtful, story-driven Instagram/Facebook post.

Return JSON:
{
  "hook": "Opening line that stops scroll",
  "body": "Personal narrative or relatable scenario (150-300 words)",
  "cta": "Question or prompt for comments",
  "hashtags": ["relevant", "hashtags"],
  "visual_suggestions": {
    "formatting": "Use of emojis, line breaks, emphasis"
  }
}`,

    engagement_post: `Create a post designed to maximize comments and engagement.

Return JSON:
{
  "hook": "Provocative question or statement",
  "body": "Brief context or options (keep short, 50-100 words)",
  "cta": "Clear instruction to comment",
  "hashtags": ["relevant", "hashtags"],
  "visual_suggestions": {
    "engagement_type": "Poll / This or That / Fill in the blank"
  }
}`,

    newsletter: `Create a newsletter section with depth and value.

Return JSON:
{
  "hook": "Section headline",
  "body": "Opening paragraph + detailed exploration (300-500 words) + actionable tips",
  "cta": "Closing with resources or next steps",
  "hashtags": []
}`,

    thread: `Create a Twitter/X thread.

Return JSON:
{
  "hook": "Hook tweet (280 chars max)",
  "body": "Tweet 2\n\nTweet 3\n\nTweet 4\n\nTweet 5",
  "cta": "Final tweet with CTA",
  "hashtags": ["relevant", "hashtags"]
}`,
  }

  return basePrompt + '\n\n' + (formatPrompts[contentType] || formatPrompts.deep_post)
}

function buildUserPrompt(painPoint: PainPoint, options?: ContentOptions): string {
  return `Create ${options?.tone || 'empathetic'} content with a ${options?.goal || 'engagement'} goal.

Pain Point: "${painPoint.pain_point}"
Category: ${painPoint.category}
Sentiment: ${painPoint.sentiment}
Frequency: ${painPoint.frequency}
Example Quote: "${painPoint.raw_content || 'N/A'}"

${options?.additionalNotes ? `Additional Instructions: ${options.additionalNotes}` : ''}

Generate engaging, scroll-stopping content that resonates with the target audience.`
}

function getDefaultPlatform(contentType: string): string {
  const platformMap: Record<string, string> = {
    reel: 'instagram',
    short_form: 'tiktok',
    meme: 'instagram',
    post: 'instagram',
    deep_post: 'instagram',
    engagement_post: 'facebook',
    newsletter: 'email',
    thread: 'twitter'
  }
  return platformMap[contentType] || 'instagram'
}