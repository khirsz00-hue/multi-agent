'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Lightbulb } from 'lucide-react'
import type { AudienceInsight } from '@/lib/types'

interface InsightSelectorProps {
  insights: AudienceInsight[]
  selectedInsight: AudienceInsight | null
  onSelectInsight: (insight: AudienceInsight) => void
  customInsight: string
  onCustomInsightChange: (value: string) => void
}

export function InsightSelector({
  insights,
  selectedInsight,
  onSelectInsight,
  customInsight,
  onCustomInsightChange
}: InsightSelectorProps) {
  const [mode, setMode] = useState<'notion' | 'custom'>('notion')

  return (
    <div className="space-y-4">
      <RadioGroup value={mode} onValueChange={(v: any) => setMode(v)}>
        <div className="flex gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="notion" id="notion" />
            <Label htmlFor="notion" className="cursor-pointer">
              📝 Wybierz z Notion
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom" className="cursor-pointer">
              ✍️ Wpisz Własny
            </Label>
          </div>
        </div>
      </RadioGroup>

      {mode === 'notion' ? (
        <div>
          <Label className="mb-2 block">Dostępne Insighty z Notion:</Label>
          <ScrollArea className="h-64 border rounded-lg">
            <div className="p-2 space-y-2">
              {insights.length > 0 ? (
                insights.map((insight) => (
                  <div
                    key={insight.id}
                    onClick={() => onSelectInsight(insight)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedInsight?.id === insight.id
                        ? 'bg-blue-50 border-2 border-blue-600'
                        : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {insight.pain_point}
                        </p>
                        {insight.sentiment && (
                          <p className="text-xs text-gray-500 mt-1">
                            Sentiment: {insight.sentiment}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Brak insightów z Notion</p>
                  <p className="text-xs mt-1">Zsynchronizuj Notion aby zobaczyć insighty</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div>
          <Label className="mb-2 block">Wpisz Własny Insight:</Label>
          <Textarea
            placeholder="np. 'ADHD brain podczas próby skupienia na jednym zadaniu' lub 'Programiści vs. Bug który się pojawia tylko na produkcji'"
            value={customInsight}
            onChange={(e) => onCustomInsightChange(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Im bardziej szczegółowy insight, tym lepszy mem!
          </p>
        </div>
      )}
    </div>
  )
}
