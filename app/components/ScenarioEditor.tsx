'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Sparkles,
  TrendingUp
} from 'lucide-react'
import { type ReelScenario } from '@/lib/reel-validator'

interface KeyMoment {
  timing: string
  description: string
  text: string
}

interface ScenarioEditorProps {
  draftId: string
  initialScenario: ReelScenario
  validation: any
  qualityScore: number
  onUpdate: (updatedScenario: ReelScenario, changedFields: any) => Promise<void>
  onFinalize: () => Promise<void>
  loading?: boolean
}

export function ScenarioEditor({
  draftId,
  initialScenario,
  validation: initialValidation,
  qualityScore: initialQualityScore,
  onUpdate,
  onFinalize,
  loading = false
}: ScenarioEditorProps) {
  const [scenario, setScenario] = useState<ReelScenario>(initialScenario)
  const [validation, setValidation] = useState(initialValidation)
  const [qualityScore, setQualityScore] = useState(initialQualityScore)
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Update validation when scenario changes
  useEffect(() => {
    setValidation(initialValidation)
    setQualityScore(initialQualityScore)
  }, [initialValidation, initialQualityScore])
  
  const handleFieldChange = (field: keyof ReelScenario, value: any) => {
    setScenario(prev => ({ ...prev, [field]: value }))
    setChangedFields(prev => new Set(prev).add(field))
  }
  
  const handleKeyMomentChange = (index: number, field: keyof KeyMoment, value: string) => {
    const newKeyMoments = [...(scenario.key_moments || [])]
    newKeyMoments[index] = { ...newKeyMoments[index], [field]: value }
    handleFieldChange('key_moments', newKeyMoments)
  }
  
  const addKeyMoment = () => {
    const newKeyMoments = [
      ...(scenario.key_moments || []),
      { timing: '0-3s', description: '', text: '' }
    ]
    handleFieldChange('key_moments', newKeyMoments)
  }
  
  const removeKeyMoment = (index: number) => {
    const newKeyMoments = (scenario.key_moments || []).filter((_, i) => i !== index)
    handleFieldChange('key_moments', newKeyMoments)
  }
  
  const handleSave = async () => {
    if (changedFields.size === 0) return
    
    setSaving(true)
    setShowSuccess(false)
    
    try {
      const changes: any = {}
      changedFields.forEach(field => {
        changes[field] = (scenario as any)[field]
      })
      
      await onUpdate(scenario, changes)
      setChangedFields(new Set())
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }
  
  const hookCharCount = scenario.hook?.length || 0
  const ctaCharCount = scenario.cta?.length || 0
  
  return (
    <div className="space-y-6">
      {/* Quality Score */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Quality Score
            </h3>
            <p className="text-xs text-purple-700 mt-1">
              Based on validation and content quality
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-900">{qualityScore}</div>
            <div className="text-xs text-purple-700">out of 100</div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-purple-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
            style={{ width: `${qualityScore}%` }}
          />
        </div>
      </div>
      
      {/* Validation Warnings */}
      {validation?.warnings && validation.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validation.warnings.map((warning: string, i: number) => (
                <li key={i} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Success Message */}
      {showSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            Changes saved successfully!
          </AlertDescription>
        </Alert>
      )}
      
      {/* Hook Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="hook" className="text-sm font-medium">
            🎬 Hook (First 3 seconds)
          </Label>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${
              hookCharCount >= 30 && hookCharCount <= 150 
                ? 'text-green-600' 
                : 'text-orange-600'
            }`}>
              {hookCharCount} chars
            </span>
            {validation?.hook_length_valid && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>
        <Textarea
          id="hook"
          value={scenario.hook || ''}
          onChange={(e) => handleFieldChange('hook', e.target.value)}
          rows={2}
          className="resize-none"
          placeholder="Attention-grabbing first 3 seconds (30-150 characters)"
        />
        <p className="text-xs text-gray-500 mt-1">
          Aim for 30-150 characters (~6-30 words) for a 3-10 second hook
        </p>
      </div>
      
      {/* Body Editor */}
      <div>
        <Label htmlFor="body" className="text-sm font-medium mb-2 block">
          📝 Body (Main Content)
        </Label>
        <Textarea
          id="body"
          value={scenario.body || ''}
          onChange={(e) => handleFieldChange('body', e.target.value)}
          rows={6}
          className="resize-none"
          placeholder="Main content with clear structure and storytelling..."
        />
      </div>
      
      {/* CTA Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="cta" className="text-sm font-medium">
            🎯 Call to Action
          </Label>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${
              ctaCharCount >= 10 ? 'text-green-600' : 'text-orange-600'
            }`}>
              {ctaCharCount} chars
            </span>
            {validation?.cta_clear && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>
        <Textarea
          id="cta"
          value={scenario.cta || ''}
          onChange={(e) => handleFieldChange('cta', e.target.value)}
          rows={2}
          className="resize-none"
          placeholder="What action do you want viewers to take?"
        />
        <p className="text-xs text-gray-500 mt-1">
          Questions work best: &ldquo;Have you experienced this?&rdquo; or &ldquo;Tag someone who needs this!&rdquo;
        </p>
      </div>
      
      {/* Key Moments Timeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium">
            ⏱️ Key Moments Timeline
          </Label>
          <Button 
            onClick={addKeyMoment}
            variant="outline" 
            size="sm"
            className="h-8"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Moment
          </Button>
        </div>
        
        <div className="space-y-3">
          {scenario.key_moments?.map((moment, index) => (
            <div key={index} className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-600">Timing</Label>
                      <Input
                        value={moment.timing}
                        onChange={(e) => handleKeyMomentChange(index, 'timing', e.target.value)}
                        placeholder="0-3s"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Description</Label>
                      <Input
                        value={moment.description}
                        onChange={(e) => handleKeyMomentChange(index, 'description', e.target.value)}
                        placeholder="Hook, Main point, CTA..."
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Text/Voiceover</Label>
                    <Textarea
                      value={moment.text}
                      onChange={(e) => handleKeyMomentChange(index, 'text', e.target.value)}
                      placeholder="What happens at this moment..."
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => removeKeyMoment(index)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {(!scenario.key_moments || scenario.key_moments.length === 0) && (
          <p className="text-sm text-gray-500 text-center py-4">
            No key moments yet. Add at least 2-3 key moments to structure your reel.
          </p>
        )}
      </div>
      
      {/* Visual Suggestions */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="format" className="text-sm font-medium mb-2 block">
            🎨 Visual Format
          </Label>
          <Input
            id="format"
            value={scenario.visual_suggestions?.format || ''}
            onChange={(e) => handleFieldChange('visual_suggestions', {
              ...scenario.visual_suggestions,
              format: e.target.value
            })}
            placeholder="talking head / b-roll / text overlay"
            className="h-9"
          />
        </div>
        <div>
          <Label htmlFor="music" className="text-sm font-medium mb-2 block">
            🎵 Music Vibe
          </Label>
          <Input
            id="music"
            value={scenario.visual_suggestions?.music_vibe || ''}
            onChange={(e) => handleFieldChange('visual_suggestions', {
              ...scenario.visual_suggestions,
              music_vibe: e.target.value
            })}
            placeholder="upbeat / emotional / trending"
            className="h-9"
          />
        </div>
      </div>
      
      {/* Hashtags */}
      <div>
        <Label htmlFor="hashtags" className="text-sm font-medium mb-2 block">
          #️⃣ Hashtags
        </Label>
        <Input
          id="hashtags"
          value={scenario.hashtags?.join(' ') || ''}
          onChange={(e) => handleFieldChange(
            'hashtags', 
            e.target.value.split(' ').filter(tag => tag.trim())
          )}
          placeholder="#adhd #neurodiversity #relatable"
          className="h-9"
        />
        <p className="text-xs text-gray-500 mt-1">
          Separate hashtags with spaces. Aim for 5-10 focused hashtags.
        </p>
      </div>
      
      {/* Suggestions */}
      {validation?.suggestions && validation.suggestions.length > 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <p className="text-sm font-medium text-blue-900 mb-2">💡 Suggestions:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              {validation.suggestions.map((suggestion: string, i: number) => (
                <li key={i}>{suggestion}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button 
          onClick={handleSave}
          disabled={changedFields.size === 0 || saving}
          variant="outline"
          className="flex-1"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Save Changes {changedFields.size > 0 && `(${changedFields.size})`}
            </>
          )}
        </Button>
        <Button 
          onClick={onFinalize}
          disabled={loading || !validation?.overall_valid || changedFields.size > 0}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Finalizing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Finalize & Generate Reel
            </>
          )}
        </Button>
      </div>
      
      {changedFields.size > 0 && (
        <p className="text-sm text-orange-600 text-center">
          ⚠️ You have unsaved changes. Save them before finalizing.
        </p>
      )}
      
      {!validation?.overall_valid && changedFields.size === 0 && (
        <p className="text-sm text-orange-600 text-center">
          ⚠️ Fix validation issues above before finalizing.
        </p>
      )}
    </div>
  )
}
