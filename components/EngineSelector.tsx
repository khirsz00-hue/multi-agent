'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'

export type ImageEngine = 'google-ai' | 'dall-e' | 'replicate'
export type VideoEngine = 'runway' | 'pika'

export interface EngineOption {
  id: string
  name: string
  description: string
  badges: string[]
  estimatedTime: string
  icon?: React.ReactNode
}

interface EngineSelectorProps {
  label: string
  options: EngineOption[]
  selectedEngine: string
  onEngineChange: (engineId: string) => void
  className?: string
}

export function EngineSelector({
  label,
  options,
  selectedEngine,
  onEngineChange,
  className = ''
}: EngineSelectorProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid gap-2">
        {options.map((option) => (
          <Card
            key={option.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedEngine === option.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onEngineChange(option.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <span className="font-semibold text-base">{option.name}</span>
                  </div>
                  <p className="text-sm text-gray-600">{option.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {option.badges.map((badge, idx) => (
                      <Badge
                        key={idx}
                        variant={badge.includes('Recommended') || badge.includes('Default') ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {badge}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 italic">
                    ⏱️ Est. time: {option.estimatedTime}
                  </p>
                </div>
                {selectedEngine === option.id && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
