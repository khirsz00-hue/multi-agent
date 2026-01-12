"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AgentBuilder } from '@/components/AgentBuilder'
import { Space, Agent } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Bot, Target } from 'lucide-react'

export default function SpaceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const spaceId = params.id as string

  const [space, setSpace] = useState<Space | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAgentBuilder, setShowAgentBuilder] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupMessage, setSetupMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (spaceId) {
      loadSpaceData()
    }
  }, [spaceId])

  const loadSpaceData = async () => {
    try {
      // Load space details
      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', spaceId)
        .single()

      if (spaceError) throw spaceError
      setSpace(spaceData)

      // Load agents in this space
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })

      if (agentsError) throw agentsError
      setAgents(agentsData || [])
    } catch (error) {
      console.error('Error loading space data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAgent = async (agentData: Partial<Agent>) => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .insert(agentData)
        .select()
        .single()

      if (error) throw error

      setAgents([data, ...agents])
    } catch (error) {
      console.error('Error creating agent:', error)
      throw error
    }
  }

  const handleSetupAllAgents = async () => {
    setSetupLoading(true)
    setSetupMessage(null)
    try {
      const res = await fetch('/api/setup-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to setup agents')
      }
      
      await loadSpaceData()
      setSetupMessage({ type: 'success', text: '✅ All agents created! Check the Dashboard.' })
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSetupMessage(null), 5000)
    } catch (error: any) {
      console.error('Setup error:', error)
      setSetupMessage({ type: 'error', text: `Error: ${error.message}` })
    } finally {
      setSetupLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!space) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Space not found</p>
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
              <Link href="/spaces">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{space.name}</h1>
                {space.description && (
                  <p className="text-gray-600 text-sm">{space.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agents.length > 0 && (
                <Link href={`/spaces/${spaceId}/dashboard`}>
                  <Button variant="outline">
                    <Target className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              )}
              <Button onClick={() => setShowAgentBuilder(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Agent
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Setup Message */}
        {setupMessage && (
          <div className={`mb-6 p-4 rounded-lg border ${
            setupMessage.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-900' 
              : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {setupMessage.text}
          </div>
        )}

        {/* Setup banner - only show if agents exist but none have roles */}
        {agents.length > 0 && !agents.some(a => a.role) && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">🚀 Setup Multi-Agent System</h3>
            <p className="text-sm text-blue-700 mb-3">
              Create all 4 specialized agents with sample data to see the system in action
            </p>
            <Button 
              onClick={handleSetupAllAgents}
              disabled={setupLoading}
            >
              {setupLoading ? 'Creating Agents...' : 'Create All Agents'}
            </Button>
          </div>
        )}

        {agents.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No agents yet. Create your first agent!</p>
            <Button onClick={() => setShowAgentBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link key={agent.id} href={`/agents/${agent.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Bot className="h-5 w-5 text-primary" />
                      <CardTitle>{agent.name}</CardTitle>
                    </div>
                    {agent.description && (
                      <CardDescription>{agent.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Type: {agent.type}</p>
                      <p>Model: {agent.llm_provider} • {agent.llm_model}</p>
                      <p>Created {new Date(agent.created_at).toLocaleDateString()}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <AgentBuilder
        open={showAgentBuilder}
        onOpenChange={setShowAgentBuilder}
        spaceId={spaceId}
        onSave={handleCreateAgent}
      />
    </div>
  )
}
