"use client"

import React from 'react'
import { Space } from '@/lib/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FolderOpen } from 'lucide-react'

interface SpaceCardProps {
  space: Space
}

export function SpaceCard({ space }: SpaceCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <CardTitle>{space.name}</CardTitle>
        </div>
        {space.description && (
          <CardDescription>{space.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Created {new Date(space.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  )
}
