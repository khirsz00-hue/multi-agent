'use client'

import React from 'react'
import { Zap, Sparkles, Scale } from 'lucide-react'
import { EngineSelector, ImageEngine, EngineOption } from './EngineSelector'

interface ImageEngineSelectorProps {
  selectedEngine: ImageEngine
  onEngineChange: (engine: ImageEngine) => void
  className?: string
}

const imageEngineOptions: EngineOption[] = [
  {
    id: 'google-ai',
    name: 'Google AI',
    description: 'Fastest generation with good quality. Perfect for quick memes and rapid content creation.',
    badges: ['Fastest', '⚡ Quick'],
    estimatedTime: '5-10 seconds',
    icon: <Zap className="h-5 w-5 text-yellow-500" />
  },
  {
    id: 'dall-e',
    name: 'DALL-E',
    description: 'Most creative and highest quality. Best for polished, professional-looking content.',
    badges: ['Most Creative', 'Recommended', '✨ Best Quality'],
    estimatedTime: '10-15 seconds',
    icon: <Sparkles className="h-5 w-5 text-purple-500" />
  },
  {
    id: 'replicate',
    name: 'Replicate',
    description: 'Balanced quality and speed. Great all-around option for various content types.',
    badges: ['Balanced', '⚖️ Versatile'],
    estimatedTime: '8-12 seconds',
    icon: <Scale className="h-5 w-5 text-blue-500" />
  }
]

export function ImageEngineSelector({
  selectedEngine,
  onEngineChange,
  className
}: ImageEngineSelectorProps) {
  return (
    <EngineSelector
      label="Image Generation Engine"
      options={imageEngineOptions}
      selectedEngine={selectedEngine}
      onEngineChange={(id) => onEngineChange(id as ImageEngine)}
      className={className}
    />
  )
}

// Tooltip information for each engine (can be used in info popovers)
export const imageEngineInfo = {
  'google-ai': 'Fastest, good for quick memes. Uses Google\'s latest AI models for rapid generation.',
  'dall-e': 'Most creative, best quality. OpenAI\'s DALL-E 3 produces stunning, professional results.',
  'replicate': 'Balanced quality and speed. Flexible option that works well for most use cases.'
}
