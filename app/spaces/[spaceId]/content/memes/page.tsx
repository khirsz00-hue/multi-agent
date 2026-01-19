'use client'

import { useState, useEffect } from 'react'
import { MemeCreatorWizard } from '@/app/components/MemeCreatorWizard'
import { ToastProvider } from '@/components/ui/toast'
import { Laugh, Sparkles } from 'lucide-react'

export default function MemesPage() {
  return (
    <ToastProvider>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg p-3">
              <Laugh className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kreator Memów</h1>
              <p className="text-gray-600">
                Generuj viralowe memy z pomocą AI
              </p>
            </div>
          </div>
        </div>

        {/* Wizard */}
        <MemeCreatorWizard />
      </div>
    </ToastProvider>
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
