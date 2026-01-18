import { Laugh } from 'lucide-react'

export default function MemesPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Laugh className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          😂 Kreator Memów
        </h1>
        <p className="text-gray-600 mb-6">
          Wkrótce: Pełny kreator memów z DALL-E 3, Google Imagen i Replicate
        </p>
        <div className="inline-block bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm">
          🚧 W budowie - PR #7
        </div>
      </div>
    </div>
  )
}
