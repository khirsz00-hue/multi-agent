'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import MultiAgentDashboard from '@/components/dashboard/MultiAgentDashboard'

export default function DashboardPage() {
  const params = useParams()
  const spaceId = params.spaceId as string

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href={`/spaces/${spaceId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Multi-Agent Dashboard</h1>
              <p className="text-sm text-gray-600">Unified view of all agents working together</p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <MultiAgentDashboard spaceId={spaceId} />
      </main>
    </div>
  )
}
