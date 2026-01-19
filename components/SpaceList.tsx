"use client"

import React from 'react'
import Link from 'next/link'
import { Space } from '@/lib/types'
import { SpaceCard } from './SpaceCard'

interface SpaceListProps {
  spaces: Space[]
}

export function SpaceList({ spaces }: SpaceListProps) {
  if (spaces.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No spaces yet. Create your first space to get started!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {spaces.map((space) => (
        <Link key={space.id} href={`/spaces/${space.id}/agents`}>
          <SpaceCard space={space} />
        </Link>
      ))}
    </div>
  )
}
