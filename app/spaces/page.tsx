"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SpaceList } from '@/components/SpaceList'
import { Space } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Home } from 'lucide-react'

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [newSpaceDescription, setNewSpaceDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadSpaces()
  }, [])

  const loadSpaces = async () => {
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSpaces(data || [])
    } catch (error) {
      console.error('Error loading spaces:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSpaceName.trim()) return

    setCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('Please sign in to create a space')
        return
      }

      const { data, error } = await supabase
        .from('spaces')
        .insert({
          name: newSpaceName,
          description: newSpaceDescription,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      setSpaces([data, ...spaces])
      setShowCreateDialog(false)
      setNewSpaceName('')
      setNewSpaceDescription('')
    } catch (error) {
      console.error('Error creating space:', error)
      alert('Failed to create space. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">My Spaces</h1>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Space
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading spaces...</p>
          </div>
        ) : (
          <SpaceList spaces={spaces} />
        )}
      </main>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Space</DialogTitle>
            <DialogDescription>
              Create a workspace to organize your AI agents
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSpace} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Space Name</Label>
              <Input
                id="name"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                placeholder="e.g., Marketing Team"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newSpaceDescription}
                onChange={(e) => setNewSpaceDescription(e.target.value)}
                placeholder="Brief description of this space..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Space'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
