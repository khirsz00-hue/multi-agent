"use client"

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatInterface } from '@/components/ChatInterface'
import { FileUploader } from '@/components/FileUploader'
import { Agent, File as AgentFile, Conversation } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Settings, Trash2, BarChart3, Loader2 } from 'lucide-react'

interface PainPoint {
  id: string
  agent_id: string
  source: string
  source_id?: string
  pain_point: string
  category?: string
  frequency: number
  sentiment?: string
  raw_content?: string
  metadata?: any
  created_at: string
}

export default function AgentPage() {
  const params = useParams()
  const agentId = params.id as string

  const [agent, setAgent] = useState<Agent | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [files, setFiles] = useState<AgentFile[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [painPoints, setPainPoints] = useState<PainPoint[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (agentId) {
      loadAgentData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId])

  useEffect(() => {
    if (agent?.role === 'audience_insights') {
      loadPainPoints()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.role, agent?.id])

  const loadAgentData = async () => {
    try {
      // Load agent details
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single()

      if (agentError) throw agentError
      setAgent(agentData)

      // Load or create conversation
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        let { data: conversationData, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('agent_id', agentId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (convError && convError.code === 'PGRST116') {
          // No conversation exists, create one
          const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({
              agent_id: agentId,
              user_id: user.id,
              title: `Chat with ${agentData.name}`,
            })
            .select()
            .single()

          if (createError) throw createError
          conversationData = newConv
        } else if (convError) {
          throw convError
        }

        setConversation(conversationData)
      }

      // Load files
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })

      if (filesError) throw filesError
      setFiles(filesData || [])
    } catch (error) {
      console.error('Error loading agent data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUploaded = (file: AgentFile) => {
    setFiles([file, ...files])
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)

      if (error) throw error

      setFiles(files.filter(f => f.id !== fileId))
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Failed to delete file')
    }
  }

  const handleAnalyzeNotion = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/agents/audience-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent?.id,
          action: 'analyze_notion_posts'
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        alert(`✅ Analysis complete! Found ${data.pain_points?.length || 0} pain points from ${data.posts_analyzed || 0} posts`)
        // Reload pain points after analysis
        await loadPainPoints()
      } else {
        throw new Error(data.error || 'Failed to analyze')
      }
    } catch (error: any) {
      console.error('Analysis error:', error)
      alert(`❌ Analysis failed: ${error.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const loadPainPoints = async () => {
    if (agent?.role !== 'audience_insights') return
    
    try {
      const res = await fetch('/api/agents/audience-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          action: 'get_top_pain_points'
        })
      })
      const data = await res.json()
      setPainPoints(data.pain_points || [])
    } catch (error) {
      console.error('Error loading pain points:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading agent...</p>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Agent not found</p>
          <Link href="/spaces">
            <Button>Back to Spaces</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/spaces/${agent.space_id}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                <p className="text-sm text-gray-600">
                  {agent.llm_provider} • {agent.llm_model}
                </p>
              </div>
            </div>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Agent Info & Files */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agent Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="font-medium">Type:</p>
                  <p className="text-gray-600">{agent.type}</p>
                </div>
                {agent.description && (
                  <div>
                    <p className="font-medium">Description:</p>
                    <p className="text-gray-600">{agent.description}</p>
                  </div>
                )}
                <div>
                  <p className="font-medium">Temperature:</p>
                  <p className="text-gray-600">{agent.llm_temperature}</p>
                </div>
                <div>
                  <p className="font-medium">Max Tokens:</p>
                  <p className="text-gray-600">{agent.llm_max_tokens}</p>
                </div>
              </CardContent>
            </Card>

            {/* Audience Insights Actions */}
            {agent?.role === 'audience_insights' && (
              <Card>
                <CardHeader>
                  <CardTitle>Notion Analysis</CardTitle>
                  <CardDescription>
                    Extract pain points from Notion database
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleAnalyzeNotion}
                    disabled={analyzing}
                    className="w-full"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        📊 Analyze Notion Posts
                      </>
                    )}
                  </Button>
                  
                  {painPoints.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">
                        Found Pain Points: {painPoints.length}
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {painPoints.slice(0, 5).map((pp) => (
                          <div key={pp.id} className="p-2 bg-gray-50 rounded text-xs">
                            <div className="font-medium">{pp.pain_point}</div>
                            <div className="text-gray-500 mt-1">
                              Category: {pp.category} • Frequency: {pp.frequency}
                            </div>
                          </div>
                        ))}
                      </div>
                      {painPoints.length > 5 && (
                        <p className="text-xs text-gray-500 mt-2">
                          +{painPoints.length - 5} more in dashboard
                        </p>
                      )}
                      {agent?.space_id && (
                        <Link href={`/spaces/${agent.space_id}/dashboard`}>
                          <Button variant="outline" className="w-full mt-2" size="sm">
                            View in Dashboard →
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                  
                  {painPoints.length === 0 && !analyzing && (
                    <p className="text-xs text-gray-500">
                      No pain points yet. Click the button above to analyze your Notion posts.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Knowledge Base</CardTitle>
                <CardDescription>Upload files for the agent</CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploader agentId={agentId} onFileUploaded={handleFileUploaded} />
                
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium">Uploaded Files:</h4>
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                      >
                        <span className="truncate flex-1">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeleteFile(file.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right - Chat Interface */}
          <div className="lg:col-span-2">
            {conversation ? (
              <ChatInterface
                agent={agent}
                conversationId={conversation.id}
                initialMessages={[]}
              />
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-500">
                    Please sign in to start a conversation
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
