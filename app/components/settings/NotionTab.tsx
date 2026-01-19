'use client'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Database, ExternalLink } from 'lucide-react'
import { useState } from 'react'

interface NotionTabProps {
  spaceId: string
  settings: any
}

export function NotionTab({ spaceId, settings }: NotionTabProps) {
  const [databaseId, setDatabaseId] = useState(settings?.notion_database_id || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/update-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId,
          notionDatabaseId: databaseId
        })
      })

      if (res.ok) {
        alert('✅ Konfiguracja Notion zapisana!')
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
          <Database className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-lg">Integracja z Notion</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label>ID bazy danych Notion</Label>
            <Input
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={databaseId}
              onChange={(e) => setDatabaseId(e.target.value)}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Znajdziesz go w URLu swojej bazy Notion
            </p>
          </div>

          {settings?.notion_last_sync && (
            <div>
              <Label>Ostatnia synchronizacja</Label>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(settings.notion_last_sync).toLocaleString('pl-PL')}
              </p>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Zapisywanie...' : 'Zapisz Konfigurację'}
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-2">
          Jak skonfigurować integrację?
        </h3>
        <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
          <li>
            Wejdź na stronę{' '}
            <a
              href="https://www.notion.so/my-integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Notion Integrations
              <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>Utwórz nową integrację i skopiuj klucz API</li>
          <li>Dodaj klucz API w zakładce &quot;Klucze API&quot;</li>
          <li>Udostępnij swoją bazę danych Notion tej integracji</li>
          <li>Skopiuj ID bazy z URLu (ciąg 32 znaków po nazwie workspace)</li>
          <li>Wklej ID powyżej i zapisz</li>
        </ol>
      </Card>
    </div>
  )
}
