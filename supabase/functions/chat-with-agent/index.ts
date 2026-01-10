import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { agentId, conversationId, message } = await req.json()

    if (!agentId || !conversationId || !message) {
      throw new Error('Missing required parameters')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get agent configuration
    const { data: agent, error: agentError } = await supabaseClient
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (agentError) throw agentError

    // Get conversation history
    const { data: messages, error: messagesError } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    if (messagesError) throw messagesError

    // Save user message
    const { error: saveUserError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
      })

    if (saveUserError) throw saveUserError

    // Perform similarity search for relevant file chunks (RAG)
    const { data: fileChunks } = await supabaseClient.rpc('match_file_chunks', {
      query_embedding: [], // Would need to generate embedding first
      match_threshold: 0.7,
      match_count: 5,
      agent_id: agentId,
    })

    // Build context from file chunks
    const context = fileChunks?.map((chunk: any) => chunk.content).join('\n\n') || ''

    // Build messages for LLM
    const llmMessages = [
      ...(agent.system_instructions
        ? [{ role: 'system', content: agent.system_instructions }]
        : []),
      ...(context
        ? [{ role: 'system', content: `Context from knowledge base:\n${context}` }]
        : []),
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    // Call appropriate LLM API
    let assistantMessage = ''

    switch (agent.llm_provider) {
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: agent.llm_model,
            messages: llmMessages,
            temperature: agent.llm_temperature,
            max_tokens: agent.llm_max_tokens,
          }),
        })

        const data = await response.json()
        assistantMessage = data.choices[0].message.content
        break
      }

      case 'anthropic': {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: agent.llm_model,
            messages: llmMessages.filter(m => m.role !== 'system'),
            system: agent.system_instructions,
            temperature: agent.llm_temperature,
            max_tokens: agent.llm_max_tokens,
          }),
        })

        const data = await response.json()
        assistantMessage = data.content[0].text
        break
      }

      case 'google': {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${agent.llm_model}:generateContent?key=${Deno.env.get('GOOGLE_AI_API_KEY')}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: llmMessages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
              generationConfig: {
                temperature: agent.llm_temperature,
                maxOutputTokens: agent.llm_max_tokens,
              },
            }),
          }
        )

        const data = await response.json()
        assistantMessage = data.candidates[0].content.parts[0].text
        break
      }

      case 'ollama': {
        const response = await fetch(`${Deno.env.get('OLLAMA_ENDPOINT')}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: agent.llm_model,
            messages: llmMessages,
            stream: false,
            options: {
              temperature: agent.llm_temperature,
              num_predict: agent.llm_max_tokens,
            },
          }),
        })

        const data = await response.json()
        assistantMessage = data.message.content
        break
      }

      default:
        throw new Error(`Unsupported LLM provider: ${agent.llm_provider}`)
    }

    // Save assistant message
    const { error: saveAssistantError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage,
      })

    if (saveAssistantError) throw saveAssistantError

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
