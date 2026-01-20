import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { insight, spaceId, previousProposal, feedback } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const systemPrompt = `Jesteś ekspertem od tworzenia viralowych memów. Twórz angażujące, humorystyczne propozycje tekstów memowych.

Twoje zadanie:
1. Przeanalizuj insight
2. Stwórz tekst górny i dolny dla mema
3. Opcjonalnie zaproponuj tekst środkowy
4. Zaproponuj szablon mema jeśli pasuje (Drake, Distracted Boyfriend, itp.)
5. Wyjaśnij dlaczego ten mem będzie działał

Zwróć JSON:
{
  "topText": "Tekst na górze mema",
  "middleText": "Opcjonalny tekst środkowy",
  "bottomText": "Tekst na dole mema",
  "template": "Nazwa szablonu lub 'custom'",
  "reasoning": "Dlaczego ten mem będzie viralowy"
}

WAŻNE: Odpowiadaj ZAWSZE po polsku!${previousProposal && feedback ? `

POPRZEDNIA WERSJA:
${JSON.stringify(previousProposal, null, 2)}

FEEDBACK UŻYTKOWNIKA:
"${feedback}"

Ulepsz mema na podstawie tego feedbacku. Zachowaj to co działa, zmień to co nie działa.
` : ''}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Stwórz mema dla tego insightu:\n\n"${insight}"` }
      ],
      response_format: { type: 'json_object' }
    })
    
    const proposal = JSON.parse(completion.choices[0].message.content || '{}')
    
    return NextResponse.json({ success: true, proposal })
  } catch (error: any) {
    console.error('Meme proposal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
