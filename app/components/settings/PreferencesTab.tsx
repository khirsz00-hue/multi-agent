'use client'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings } from 'lucide-react'
import { useState } from 'react'

interface PreferencesTabProps {
  spaceId: string
  settings: any
}

export function PreferencesTab({ spaceId, settings }: PreferencesTabProps) {
  const [autoSave, setAutoSave] = useState(settings?.auto_save_drafts ?? true)
  const [aiSuggestions, setAiSuggestions] = useState(settings?.enable_ai_suggestions ?? true)
  const [language, setLanguage] = useState(settings?.content_language || 'pl')
  const [defaultTextEngine, setDefaultTextEngine] = useState(settings?.default_text_engine || 'openai')
  const [defaultImageEngine, setDefaultImageEngine] = useState(settings?.default_image_engine || 'dall-e-3')
  const [defaultVideoTextEngine, setDefaultVideoTextEngine] = useState(settings?.default_video_text_engine || 'creatomat')
  const [defaultVideoAvatarEngine, setDefaultVideoAvatarEngine] = useState(settings?.default_video_avatar_engine || 'd-id')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/update-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId,
          autoSaveDrafts: autoSave,
          enableAiSuggestions: aiSuggestions,
          contentLanguage: language,
          defaultTextEngine,
          defaultImageEngine,
          defaultVideoTextEngine,
          defaultVideoAvatarEngine
        })
      })

      if (res.ok) {
        alert('✅ Preferencje zapisane!')
      }
    } catch (error) {
      alert('Błąd zapisu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-lg">Ogólne Preferencje</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Automatyczny zapis wersji roboczych</Label>
            <Switch
              checked={autoSave}
              onCheckedChange={setAutoSave}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Włącz sugestie AI</Label>
            <Switch
              checked={aiSuggestions}
              onCheckedChange={setAiSuggestions}
            />
          </div>

          <div>
            <Label>Język treści</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pl">Polski</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-6">Domyślne Silniki AI</h3>

        <div className="space-y-4">
          <div>
            <Label>Silnik tekstowy</Label>
            <Select value={defaultTextEngine} onValueChange={setDefaultTextEngine}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                <SelectItem value="google">Google AI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Silnik graficzny</Label>
            <Select value={defaultImageEngine} onValueChange={setDefaultImageEngine}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                <SelectItem value="midjourney">Midjourney</SelectItem>
                <SelectItem value="stable-diffusion">Stable Diffusion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Silnik video tekstowego</Label>
            <Select value={defaultVideoTextEngine} onValueChange={setDefaultVideoTextEngine}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="creatomat">Creatomate</SelectItem>
                <SelectItem value="pika">PIKA.AI</SelectItem>
                <SelectItem value="runway">Runway ML</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Silnik video avatar</Label>
            <Select value={defaultVideoAvatarEngine} onValueChange={setDefaultVideoAvatarEngine}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="d-id">D-ID</SelectItem>
                <SelectItem value="heygen">HeyGen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Zapisywanie...' : 'Zapisz Preferencje'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
