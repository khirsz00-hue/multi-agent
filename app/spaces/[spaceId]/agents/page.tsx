import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Bot, Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>
}) {
  const { spaceId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch agents for this space
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agenci</h1>
            <p className="text-gray-600 mt-1">
              Zarządzaj swoimi AI agentami do tworzenia contentu
            </p>
          </div>
          <Button asChild>
            <Link href={`/spaces/${spaceId}/agents/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Nowy Agent
            </Link>
          </Button>
        </div>
      </div>

      {/* Agents Grid */}
      {agents && agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-blue-100 rounded-lg p-3">
                  <Bot className="h-6 w-6 text-blue-600" />
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/spaces/${spaceId}/agents/${agent.id}/settings`}>
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                {agent.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {agent.description || agent.system_instructions || 'Brak opisu'}
              </p>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Type: {agent.type}
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/agents/${agent.id}`}>
                    Zobacz
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Brak agentów
          </h3>
          <p className="text-gray-600 mb-6">
            Stwórz swojego pierwszego agenta, aby rozpocząć tworzenie contentu
          </p>
          <Button asChild>
            <Link href={`/spaces/${spaceId}`}>
              <Plus className="h-4 w-4 mr-2" />
              Stwórz Agenta
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
