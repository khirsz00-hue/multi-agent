'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { APIKeysTab } from './APIKeysTab'
import { BudgetTab } from './BudgetTab'
import { PreferencesTab } from './PreferencesTab'
import { NotionTab } from './NotionTab'
import { Key, DollarSign, Settings, Database } from 'lucide-react'

interface SettingsTabsProps {
  spaceId: string
  apiKeys: any[]
  settings: any
}

export function SettingsTabs({ spaceId, apiKeys, settings }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="api-keys" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="api-keys" className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          <span className="hidden sm:inline">Klucze API</span>
        </TabsTrigger>
        <TabsTrigger value="budget" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">Budżet</span>
        </TabsTrigger>
        <TabsTrigger value="preferences" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Preferencje</span>
        </TabsTrigger>
        <TabsTrigger value="notion" className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <span className="hidden sm:inline">Notion</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="api-keys">
        <APIKeysTab spaceId={spaceId} apiKeys={apiKeys} />
      </TabsContent>

      <TabsContent value="budget">
        <BudgetTab spaceId={spaceId} settings={settings} />
      </TabsContent>

      <TabsContent value="preferences">
        <PreferencesTab spaceId={spaceId} settings={settings} />
      </TabsContent>

      <TabsContent value="notion">
        <NotionTab spaceId={spaceId} settings={settings} />
      </TabsContent>
    </Tabs>
  )
}
