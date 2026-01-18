'use client'

import React from 'react'
import { Video, Clapperboard } from 'lucide-react'
import { EngineSelector, VideoEngine, EngineOption } from './EngineSelector'

interface VideoEngineSelectorProps {
  selectedEngine: VideoEngine
  onEngineChange: (engine: VideoEngine) => void
  className?: string
}

const videoEngineOptions: EngineOption[] = [
  {
    id: 'runway',
    name: 'Runway',
    description: 'Creative video generation with dynamic effects. Best for artistic and dynamic shots.',
    badges: [
      { text: 'Creative', variant: 'secondary' },
      { text: '🎬 Dynamic', variant: 'secondary' }
    ],
    estimatedTime: '2-4 minutes',
    icon: <Clapperboard className="h-5 w-5 text-indigo-500" />
  },
  {
    id: 'pika',
    name: 'Pika',
    description: 'Fast short-form video generation. Perfect for reactive shorts and quick content.',
    badges: [
      { text: 'Default', variant: 'default' },
      { text: 'Fastest', variant: 'default' },
      { text: '⚡ Quick Shorts', variant: 'secondary' }
    ],
    estimatedTime: '30-90 seconds',
    icon: <Video className="h-5 w-5 text-green-500" />
  }
]

export function VideoEngineSelector({
  selectedEngine,
  onEngineChange,
  className
}: VideoEngineSelectorProps) {
  return (
    <EngineSelector
      label="Video Generation Engine"
      options={videoEngineOptions}
      selectedEngine={selectedEngine}
      onEngineChange={(id) => onEngineChange(id as VideoEngine)}
      className={className}
    />
  )
}

// Tooltip information for each engine (can be used in info popovers)
export const videoEngineInfo = {
  'runway': 'Best for dynamic shots with creative effects. Ideal for storytelling and artistic content.',
  'pika': 'Fast short-form videos (default). Perfect for reactive shorts and quick social media content.'
}
