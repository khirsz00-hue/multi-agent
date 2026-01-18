'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sparkles, Clock, DollarSign, Info } from 'lucide-react'

export type ImageEngine = 'dall-e-3'
export type VideoEngine = 'remotion' | 'creatomate' | 'd-id' | 'heygen'
export type Engine = ImageEngine | VideoEngine

interface EngineOption {
  value: Engine
  label: string
  description: string
  cost: string
  timeEstimate: string
  bestFor: string[]
}

interface EngineSelectorProps {
  contentType: 'image' | 'video'
  selectedEngine: Engine
  recommendedEngine?: Engine
  onEngineChange: (engine: Engine) => void
  showRecommendation?: boolean
}

const IMAGE_ENGINES: EngineOption[] = [
  {
    value: 'dall-e-3',
    label: 'DALL-E 3',
    description: 'OpenAI\'s latest image generation model with high quality and accuracy',
    cost: '$0.04 per image',
    timeEstimate: '10-15 seconds',
    bestFor: ['Photorealistic images', 'Complex compositions', 'Text in images', 'Consistent quality']
  }
]

const VIDEO_ENGINES: EngineOption[] = [
  {
    value: 'remotion',
    label: 'Remotion',
    description: 'Custom text-only videos with animations and background footage',
    cost: '$0.10-0.20 per video',
    timeEstimate: '30-60 seconds',
    bestFor: ['POV content', 'Quick tips', 'Memes', 'Trending formats', 'Short punchy messages']
  },
  {
    value: 'creatomate',
    label: 'Creatomate',
    description: 'Template-based text-only videos with professional animations',
    cost: '$0.10-0.20 per video',
    timeEstimate: '30-60 seconds',
    bestFor: ['Professional look', 'Brand consistency', 'Quick production', 'Text overlays']
  },
  {
    value: 'd-id',
    label: 'D-ID',
    description: 'Budget-friendly talking head videos with AI avatars and lip-sync',
    cost: '$0.30-1.00 per video',
    timeEstimate: '90-120 seconds',
    bestFor: ['Educational content', 'Explanations', 'Building trust', 'Budget-conscious']
  },
  {
    value: 'heygen',
    label: 'HeyGen',
    description: 'Premium talking head videos with high-quality AI avatars',
    cost: '$0.30-1.00 per video',
    timeEstimate: '90-120 seconds',
    bestFor: ['Professional presentations', 'High-quality avatars', 'Brand ambassadors', 'Detailed explanations']
  }
]

export function EngineSelector({
  contentType,
  selectedEngine,
  recommendedEngine,
  onEngineChange,
  showRecommendation = true
}: EngineSelectorProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  const engines = contentType === 'image' ? IMAGE_ENGINES : VIDEO_ENGINES
  const selectedEngineOption = engines.find(e => e.value === selectedEngine)
  const recommendedEngineOption = engines.find(e => e.value === recommendedEngine)

  return (
    <div className="space-y-4">
      {/* Engine Recommendation */}
      {showRecommendation && recommendedEngine && recommendedEngineOption && (
        <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-900">AI Recommendation:</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {recommendedEngineOption.label}
              </Badge>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Best fit based on your content type, tone, and goals
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Engine Selection */}
      <div className="space-y-2">
        <Label htmlFor="engine" className="text-sm font-medium">
          {contentType === 'image' ? 'Image Generation Engine' : 'Video Generation Engine'}
        </Label>
        <Select value={selectedEngine} onValueChange={onEngineChange}>
          <SelectTrigger id="engine">
            <SelectValue placeholder={`Select ${contentType} engine`} />
          </SelectTrigger>
          <SelectContent>
            {engines.map((engine) => (
              <SelectItem key={engine.value} value={engine.value}>
                <div className="flex items-center gap-2">
                  {engine.label}
                  {recommendedEngine === engine.value && (
                    <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">
                      Recommended
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Engine Details */}
      {selectedEngineOption && (
        <div className="space-y-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Info className="h-4 w-4" />
            {showDetails ? 'Hide engine details' : 'Show engine details'}
          </button>

          {showDetails && (
            <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
              <div>
                <p className="text-sm text-gray-700">{selectedEngineOption.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500">Cost</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedEngineOption.cost}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">Generation Time</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedEngineOption.timeEstimate}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Best For:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedEngineOption.bestFor.map((use, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {use}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
