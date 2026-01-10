"use client"

import React, { useState } from 'react'
import { Message, Agent } from '@/lib/types'
import { MessageList } from './MessageList'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ChatInterfaceProps {
  agent: Agent
  conversationId: string
  initialMessages?: Message[]
}

export function ChatInterface({
  agent,
  conversationId,
  initialMessages = [],
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      // Add user message to UI immediately
      const tempUserMessage: Message = {
        id: 'temp-' + Date.now(),
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, tempUserMessage])

      // Call chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          conversationId,
          message: userMessage,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Refresh messages from database to get real IDs
      const { data: updatedMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(updatedMessages || [])
    } catch (error) {
      console.error('Error sending message:', error)
      // Optionally show error message
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center justify-between">
          <span>Chat with {agent.name}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {agent.llm_provider} • {agent.llm_model}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <MessageList messages={messages} isLoading={isLoading} />

        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Shift + Enter for new line)"
              className="flex-1 min-h-[60px] max-h-[120px]"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
