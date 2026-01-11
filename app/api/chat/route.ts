import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: Request) {
  try {
    const { agentId, conversationId, message } = await request.json()

    if (!agentId || !conversationId || !message) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify user has access to this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('agent_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Verify agentId matches conversation
    if (conversation.agent_id !== agentId) {
      return NextResponse.json(
        { error: 'Agent ID does not match conversation' },
        { status: 400 }
      )
    }

    // Get agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Get relevant file context using RAG
    const context = await getRelevantContext(agentId, message, supabase)

    // Build messages array
    const messages: any[] = []

    // System message
    if (agent.system_instructions) {
      messages.push({
        role: 'system',
        content: agent.system_instructions
      })
    }

    // Add context from files if available
    if (context.length > 0) {
      messages.push({
        role: 'system',
        content: `Relevant information from uploaded files:\n\n${context.join('\n\n')}`
      })
    } else {
      messages.push({
        role: 'system',
        content: 'No relevant knowledge base content was found. If the question depends on uploaded documents, say that the information is not available in the knowledge base and avoid guessing.'
      })
    }

    // Get conversation history
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10)

    if (history) {
      messages.push(...history)
    }

    // Add user message
    messages.push({
      role: 'user',
      content: message
    })

    // Save user message to database
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message
    })

    // Generate response based on LLM provider
    let responseText = ''

    switch (agent.llm_provider) {
      case 'openai':
        responseText = await generateOpenAIResponse(messages, agent)
        break
      case 'anthropic':
        responseText = await generateAnthropicResponse(messages, agent)
        break
      case 'google':
        responseText = await generateGoogleResponse(messages, agent)
        break
      case 'ollama':
        responseText = await generateOllamaResponse(messages, agent)
        break
      default:
        throw new Error(`Unsupported LLM provider: ${agent.llm_provider}`)
    }

    // Save assistant message to database
    const { data: assistantMessage } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: responseText
      })
      .select()
      .single()

    return NextResponse.json({
      message: responseText,
      messageId: assistantMessage?.id
    })

  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate response' },
      { status: 500 }
    )
  }
}

// Helper function to get relevant context from files
async function getRelevantContext(
  agentId: string,
  query: string,
  supabase: any
): Promise<string[]> {
  try {
    // Get files for this agent
    const { data: files } = await supabase
      .from('files')
      .select('id')
      .eq('agent_id', agentId)

    if (!files || files.length === 0) {
      return []
    }

    const fileIds = files.map((f: any) => f.id)

    // Get file chunks for these files
    const { data: chunks } = await supabase
      .from('file_chunks')
      .select('content, embedding')
      .in('file_id', fileIds)
      .order('chunk_index', { ascending: true })

    if (!chunks || chunks.length === 0) {
      return []
    }

    // Try semantic search if embeddings are available
    const chunksWithEmbeddings = chunks.filter(
      (chunk: any) => Array.isArray(chunk.embedding) && chunk.embedding.length > 0
    )

    if (chunksWithEmbeddings.length > 0 && process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: query
        })

        const queryEmbedding = embeddingResponse.data[0].embedding as number[]

        const rankedContexts = chunksWithEmbeddings
          .map((chunk: any) => ({
            content: chunk.content,
            score: cosineSimilarity(queryEmbedding, chunk.embedding as number[])
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((item) => item.content)

        if (rankedContexts.length > 0) {
          return rankedContexts
        }
      } catch (embeddingError) {
        console.error('Semantic search failed:', embeddingError)
      }
    }

    // Fallback: simple keyword-based search
    const contexts: string[] = []
    const queryLower = query.toLowerCase()

    for (const chunk of chunks) {
      if (chunk.content.toLowerCase().includes(queryLower)) {
        contexts.push(chunk.content)
        if (contexts.length >= 3) break // Limit to top 3 chunks
      }
    }

    if (contexts.length === 0) {
      return chunks.slice(0, 3).map((chunk: any) => chunk.content)
    }

    return contexts

  } catch (error) {
    console.error('Error getting context:', error)
    return []
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// LLM Provider implementations
async function generateOpenAIResponse(messages: any[], agent: any): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  const completion = await openai.chat.completions.create({
    model: agent.llm_model || 'gpt-4-turbo',
    messages: messages,
    temperature: agent.llm_temperature || 0.7,
    max_tokens: agent.llm_max_tokens || 2000
  })

  return completion.choices[0].message.content || ''
}

async function generateAnthropicResponse(messages: any[], agent: any): Promise<string> {
  // Note: Type assertion needed due to SDK version compatibility
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  }) as any

  // Separate system messages from conversation
  const systemMessages = messages.filter((m: any) => m.role === 'system')
  const conversationMessages = messages.filter((m: any) => m.role !== 'system')

  const response = await anthropic.messages.create({
    model: agent.llm_model || 'claude-3-sonnet-20240229',
    system: systemMessages.map((m: any) => m.content).join('\n\n'),
    messages: conversationMessages,
    temperature: agent.llm_temperature || 0.7,
    max_tokens: agent.llm_max_tokens || 2000
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

async function generateGoogleResponse(messages: any[], agent: any): Promise<string> {
  // Google AI (Gemini) implementation
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')
  const model = genAI.getGenerativeModel({ model: agent.llm_model || 'gemini-pro' })

  // Convert messages to Google format
  const prompt = messages.map((m: any) => `${m.role}: ${m.content}`).join('\n\n')

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

async function generateOllamaResponse(messages: any[], agent: any): Promise<string> {
  // Ollama local LLM implementation
  const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434'

  const response = await fetch(`${ollamaEndpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: agent.llm_model || 'llama3',
      messages: messages,
      stream: false
    })
  })

  const data = await response.json()
  return data.message.content
}
