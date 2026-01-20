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
    let systemPrompt = `Jesteś ekspertem od tworzenia viralowych memów dotyczących ADHD i produktywności.

Twoje zadanie: Przeanalizuj insight i stwórz ZABAWNĄ, RELATABLE sugestię mema.

Zwróć JSON:
{
  "top_text": "KRÓTKI TEKST NA GÓRZE (max 60 znaków)",
  "bottom_text": "KRÓTKI TEKST NA DOLE (max 60 znaków)",
  "template": "drake" | "distracted_boyfriend" | "two_buttons" | "expanding_brain" | "is_this" | "change_my_mind",
  "reasoning": "Dlaczego ten mem będzie działał",
  "humor_score": 0-100,
  "relatability_score": 0-100
}

WAŻNE: Odpowiadaj ZAWSZE po polsku!`

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
        { role: 'user', content: `Insight:\n${insightText}\n\nStwórz viralowego mema na podstawie tego insightu.` }
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
