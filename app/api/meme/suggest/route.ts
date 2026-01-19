import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { insightText, feedback, previousSuggestion } = await request.json()
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    // Build system prompt with feedback
    let systemPrompt = `You are a viral meme creator for ADHD/productivity content.
    
Your job: Analyze the insight and create a FUNNY, RELATABLE meme suggestion.

Return JSON:
{
  "top_text": "SHORT TEXT FOR TOP (max 60 chars)",
  "bottom_text": "SHORT TEXT FOR BOTTOM (max 60 chars)",
  "template": "drake" | "distracted_boyfriend" | "two_buttons" | "expanding_brain" | "disaster_girl" | "success_kid" | "is_this" | "change_my_mind",
  "reasoning": "Why this meme works for this insight",
  "humor_score": 0-100,
  "relatability_score": 0-100
}

RULES:
- Keep text SHORT and punchy
- Use ADHD humor (chaos, irony, self-deprecating)
- Match template to content structure
- Make it INSTANTLY recognizable`

    if (previousSuggestion && feedback) {
      systemPrompt += `\n\nPREVIOUS SUGGESTION:
${JSON.stringify(previousSuggestion, null, 2)}

USER FEEDBACK: "${feedback}"

Generate IMPROVED version based on feedback. Keep what works, fix what doesn't.`
    }
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Insight:\n${insightText}\n\nCreate a viral meme for this.` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.9
    })
    
    const suggestion = JSON.parse(completion.choices[0].message.content || '{}')
    
    return NextResponse.json({ success: true, suggestion })
  } catch (error: any) {
    console.error('Meme suggestion error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
