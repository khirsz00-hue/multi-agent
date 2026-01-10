"use client"

import React from 'react'
import { LLMProvider, LLM_MODELS } from '@/lib/types'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface LLMSelectorProps {
  provider: LLMProvider
  model: string
  temperature: number
  maxTokens: number
  onProviderChange: (provider: LLMProvider) => void
  onModelChange: (model: string) => void
  onTemperatureChange: (temperature: number) => void
  onMaxTokensChange: (maxTokens: number) => void
}

export function LLMSelector({
  provider,
  model,
  temperature,
  maxTokens,
  onProviderChange,
  onModelChange,
  onTemperatureChange,
  onMaxTokensChange,
}: LLMSelectorProps) {
  const availableModels = LLM_MODELS[provider]

  // Update model if current model is not available for selected provider
  React.useEffect(() => {
    if (!availableModels.includes(model)) {
      onModelChange(availableModels[0])
    }
  }, [provider, model, availableModels, onModelChange])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="provider">LLM Provider</Label>
        <Select value={provider} onValueChange={(value) => onProviderChange(value as LLMProvider)}>
          <SelectTrigger id="provider">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="anthropic">Anthropic</SelectItem>
            <SelectItem value="google">Google</SelectItem>
            <SelectItem value="ollama">Ollama</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Select value={model} onValueChange={onModelChange}>
          <SelectTrigger id="model">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="temperature">
          Temperature: {temperature.toFixed(2)}
        </Label>
        <Input
          id="temperature"
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          className="cursor-pointer"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxTokens">Max Tokens</Label>
        <Input
          id="maxTokens"
          type="number"
          min="100"
          max="8000"
          step="100"
          value={maxTokens}
          onChange={(e) => onMaxTokensChange(parseInt(e.target.value))}
        />
      </div>
    </div>
  )
}
