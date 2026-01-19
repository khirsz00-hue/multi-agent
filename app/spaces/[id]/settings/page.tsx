import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsTabs } from '@/app/components/settings/SettingsTabs'
import { Settings as SettingsIcon } from 'lucide-react'

export default async function SettingsPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch space
  const { data: space } = await supabase
    .from('spaces')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!space) {
    redirect('/dashboard')
  }

  // Fetch API keys
  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('*')
    .eq('space_id', params.id)

  // Fetch settings
  let { data: settings } = await supabase
    .from('space_settings')
    .select('*')
    .eq('space_id', params.id)
    .single()

  // Create default settings if not exist
  if (!settings) {
    const { data: newSettings } = await supabase
      .from('space_settings')
      .insert({ space_id: params.id })
      .select()
      .single()
    
    settings = newSettings
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gray-100 rounded-lg p-2">
            <SettingsIcon className="h-6 w-6 text-gray-700" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Ustawienia</h1>
        </div>
        <p className="text-gray-600">
          Zarządzaj kluczami API, budżetem i preferencjami dla {space.name}
        </p>
      </div>

      {/* Settings Tabs */}
      <SettingsTabs
        spaceId={params.id}
        apiKeys={apiKeys || []}
        settings={settings}
      />
    </div>
  )
}
