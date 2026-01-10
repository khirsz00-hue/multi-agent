"use client"

import React, { useState } from 'react'
import { Agent, LLMProvider, AGENT_TYPES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LLMSelector } from './LLMSelector'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AgentBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string
  agent?: Agent
  onSave: (agent: Partial<Agent>) => Promise<void>
}

export function AgentBuilder({
  open,
  onOpenChange,
  spaceId,
  agent,
  onSave,
}: AgentBuilderProps) {
  const [name, setName] = useState(agent?.name || '')
  const [type, setType] = useState(agent?.type || 'custom')
  const [description, setDescription] = useState(agent?.description || '')
  const [provider, setProvider] = useState<LLMProvider>(agent?.llm_provider || 'openai')
  const [model, setModel] = useState(agent?.llm_model || 'gpt-4')
  const [temperature, setTemperature] = useState(agent?.llm_temperature || 0.7)
  const [maxTokens, setMaxTokens] = useState(agent?.llm_max_tokens || 2000)
  const [systemInstructions, setSystemInstructions] = useState(agent?.system_instructions || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSave({
        space_id: spaceId,
        name,
        type,
        description,
        llm_provider: provider,
        llm_model: model,
        llm_temperature: temperature,
        llm_max_tokens: maxTokens,
        system_instructions: systemInstructions,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving agent:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agent ? 'Edit Agent' : 'Create New Agent'}</DialogTitle>
          <DialogDescription>
            Configure your AI agent with specific instructions and LLM settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Strategist"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Agent Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select agent type" />
              </SelectTrigger>
              <SelectContent>
                {AGENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this agent does..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemInstructions">System Instructions</Label>
            <Textarea
              id="systemInstructions"
              value={systemInstructions}
              onChange={(e) => setSystemInstructions(e.target.value)}
              placeholder="Enter system instructions for the agent..."
              rows={4}
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-4">LLM Configuration</h3>
            <LLMSelector
              provider={provider}
              model={model}
              temperature={temperature}
              maxTokens={maxTokens}
              onProviderChange={setProvider}
              onModelChange={setModel}
              onTemperatureChange={setTemperature}
              onMaxTokensChange={setMaxTokens}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : agent ? 'Update Agent' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
