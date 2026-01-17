'use client'

import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'

interface VideoRecommendation {
  recommended_type: 'text_only' | 'talking_head'
  recommended_engine: string
  text_only_score: number
  talking_head_score: number
  reasoning: string
  key_factors: string[]
  estimated_cost: number
  estimated_time_seconds: number
}

interface VideoRecommendationBadgeProps {
  recommendation: VideoRecommendation | null
}

export function VideoRecommendationBadge({ recommendation }: VideoRecommendationBadgeProps) {
  if (!recommendation) return null
  
  const isTextOnly = recommendation.recommended_type === 'text_only'
  const score = isTextOnly ? recommendation.text_only_score : recommendation.talking_head_score
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-blue-900">
              AI Recommends: {isTextOnly ? 'Text-Only' : 'Talking Head'}
            </span>
            <Badge variant="secondary" className="text-xs">
              {score}% match
            </Badge>
          </div>
          
          <p className="text-xs text-blue-800">
            {recommendation.reasoning}
          </p>
          
          <div className="flex gap-3 mt-2 text-xs text-blue-700">
            <span>Engine: {recommendation.recommended_engine}</span>
            <span>~${recommendation.estimated_cost}</span>
            <span>~{recommendation.estimated_time_seconds}s</span>
          </div>
        </div>
      </div>
    </div>
  )
}
