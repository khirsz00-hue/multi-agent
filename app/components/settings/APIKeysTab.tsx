'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface APIKeysTabProps {
  spaceId: string
  apiKeys: any[]
}

const MASKED_KEY = '••••••••••••••••'

const SERVICES = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4 dla generowania treści',
    placeholder: 'sk-...',
    required: true,
    docs: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'dall-e',
    name: 'DALL-E 3',
    description: 'Generowanie obrazów i memów',
    placeholder: 'sk-...',
    required: false,
    docs: 'https://platform.openai.com/api-keys',
    note: 'Użyj tego samego klucza co OpenAI'
  },
  {
    id: 'd-id',
    name: 'D-ID',
    description: 'Talking head videos (budget)',
    placeholder: 'Basic xxx...',
    required: false,
    docs: 'https://studio.d-id.com/account-settings'
  },
  {
    id: 'heygen',
    name: 'HeyGen',
    description: 'Talking head videos (premium)',
    placeholder: 'xxx...',
    required: false,
    docs: 'https://app.heygen.com/settings/api'
  },
  {
    id: 'runway',
    name: 'Runway ML',
    description: 'Advanced video generation',
    placeholder: 'xxx...',
    required: false,
    docs: 'https://runwayml.com/api'
  },
  {
    id: 'pika',
    name: 'PIKA.AI',
    description: 'AI motion videos',
    placeholder: 'xxx...',
    required: false,
    docs: 'https://pika.art/api'
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Voice-over dla video',
    placeholder: 'xxx...',
    required: false,
    docs: 'https://elevenlabs.io/api'
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Import pain points jako insights',
    placeholder: 'secret_xxx...',
    required: false,
    docs: 'https://www.notion.so/my-integrations'
  }
]

export function APIKeysTab({ spaceId, apiKeys }: APIKeysTabProps) {
  const [keys, setKeys] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    apiKeys.forEach(key => {
      initial[key.service] = MASKED_KEY // Masked
    })
    return initial
  })
  
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({})
  const [saving, setSaving] = useState(false)

  const isKeyMasked = (key: string | undefined): boolean => {
    return !key || key.includes('••••')
  }

  const handleTest = async (serviceId: string) => {
    if (isKeyMasked(keys[serviceId])) {
      alert('Najpierw wpisz klucz API')
      return
    }

    setTesting({ ...testing, [serviceId]: true })
    setTestResults({ ...testResults, [serviceId]: null })

    try {
      const res = await fetch('/api/settings/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: serviceId,
          apiKey: keys[serviceId]
        })
      })

      const data = await res.json()

      if (data.success) {
        setTestResults({ ...testResults, [serviceId]: 'success' })
      } else {
        setTestResults({ ...testResults, [serviceId]: 'error' })
        alert(data.error || 'Test failed')
      }
    } catch (error: any) {
      setTestResults({ ...testResults, [serviceId]: 'error' })
      alert('Network error')
    } finally {
      setTesting({ ...testing, [serviceId]: false })
    }
  }

  const handleSave = async (serviceId: string) => {
    if (isKeyMasked(keys[serviceId])) {
      alert('Najpierw wpisz klucz API')
      return
    }

    setSaving(true)

    try {
      const res = await fetch('/api/settings/save-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId,
          service: serviceId,
          apiKey: keys[serviceId]
        })
      })

      if (res.ok) {
        alert('✅ Klucz zapisany!')
        // Mask the key
        setKeys({ ...keys, [serviceId]: MASKED_KEY })
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save')
      }
    } catch (error) {
      alert('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Klucze API są bezpiecznie szyfrowane
            </h3>
            <p className="text-sm text-gray-600">
              Twoje klucze są przechowywane w zaszyfrowanej formie. Możesz je testować przed zapisaniem.
            </p>
          </div>
        </div>
      </Card>

      {/* Services */}
      <div className="space-y-4">
        {SERVICES.map(service => {
          const existingKey = apiKeys.find(k => k.service === service.id)
          const isConfigured = !!existingKey
          const testResult = testResults[service.id]

          return (
            <Card key={service.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    {service.required && (
                      <Badge variant="destructive" className="text-xs">Wymagany</Badge>
                    )}
                    {isConfigured && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Skonfigurowany
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{service.description}</p>
                  {service.note && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {service.note}
                    </p>
                  )}
                </div>
                <a
                  href={service.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Dokumentacja →
                </a>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type={visible[service.id] ? 'text' : 'password'}
                      placeholder={service.placeholder}
                      value={keys[service.id] || ''}
                      onChange={(e) => setKeys({ ...keys, [service.id]: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      onClick={() => setVisible({ ...visible, [service.id]: !visible[service.id] })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {visible[service.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => handleTest(service.id)}
                    disabled={testing[service.id] || isKeyMasked(keys[service.id])}
                  >
                    {testing[service.id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : testResult === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : testResult === 'error' ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      'Test'
                    )}
                  </Button>

                  <Button
                    onClick={() => handleSave(service.id)}
                    disabled={saving || isKeyMasked(keys[service.id])}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Zapisz
                  </Button>
                </div>

                {existingKey?.last_tested_at && (
                  <p className="text-xs text-gray-500">
                    Ostatni test: {new Date(existingKey.last_tested_at).toLocaleString('pl-PL')}
                    {existingKey.test_status === 'success' && (
                      <span className="text-green-600 ml-2">✓ Success</span>
                    )}
                  </p>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
