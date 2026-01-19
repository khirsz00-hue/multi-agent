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
    
    const systemPrompt = `You are a viral meme creator expert. Create engaging, humorous meme text proposals.

Your task:
1. Analyze the insight
2. Create top text and bottom text for a meme
3. Optionally suggest a middle text
4. Suggest a meme template if applicable (Drake, Distracted Boyfriend, etc.)
5. Explain why this meme will work

Return JSON:
{
  "topText": "Text for top of meme",
  "middleText": "Optional middle text",
  "bottomText": "Text for bottom of meme",
  "template": "Suggested template name or 'custom'",
  "reasoning": "Why this meme will be viral"
}

${previousProposal && feedback ? `
PREVIOUS VERSION:
${JSON.stringify(previousProposal, null, 2)}

USER FEEDBACK:
"${feedback}"

Improve the meme based on this feedback. Keep what works, change what doesn't.
` : ''}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a meme for this insight:\n\n"${insight}"` }
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
