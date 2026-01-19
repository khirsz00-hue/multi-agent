'use client'

import { useState, useEffect } from 'react'
import { MemeCreatorWizard } from '@/app/components/MemeCreatorWizard'
import { Laugh, Sparkles } from 'lucide-react'

export default function MemesPage() {
  return (
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
  )
}
