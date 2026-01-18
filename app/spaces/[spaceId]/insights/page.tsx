import { Users } from 'lucide-react'

export default function InsightsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Users className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          📊 Audience Insights
        </h1>
        <p className="text-gray-600 mb-6">
          Wkrótce: Analityka audience, statystyki engagement i rekomendacje
        </p>
        <div className="inline-block bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm">
          🚧 W budowie - PR #12
        </div>
      </div>
    </div>
  )
}
