'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import VideoGenerationModal from '@/components/VideoGenerationModal'
import VideoProgress from '@/components/VideoProgress'
import { Film, Play } from 'lucide-react'

export default function VideoDemo() {
  const [showModal, setShowModal] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)

  // Demo task data for testing UI states
  const demoStates = {
    queued: { status: 'queued' as const, progress: 5, engine: 'pika', estimatedTime: 60 },
    processing: { status: 'processing' as const, progress: 45, engine: 'pika', estimatedTime: 30 },
    completed: { status: 'completed' as const, progress: 100, engine: 'pika', estimatedTime: 0 },
    failed: { status: 'failed' as const, progress: 60, engine: 'pika', errorMessage: 'Failed to generate video due to insufficient credits' }
  }

  const startDemoVideoGeneration = async () => {
    try {
      // Create a fake task for demo purposes
      // In production, this would call the actual API
      const fakeTaskId = 'demo-' + Date.now()
      setTaskId(fakeTaskId)
      setShowModal(true)
    } catch (error) {
      console.error('Demo error:', error)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Video Generation Demo</h1>
        <p className="text-gray-600">
          Test the video generation UI components and flow
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Video Generation Modal</CardTitle>
          <CardDescription>
            Click the button below to test the video generation flow with simulated progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={startDemoVideoGeneration} className="w-full" size="lg">
            <Play className="h-5 w-5 mr-2" />
            Start Demo Video Generation
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Progress States Preview</CardTitle>
          <CardDescription>
            Visual preview of different video generation states
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Queued</h3>
            <VideoProgress {...demoStates.queued} />
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-sm">Processing (45%)</h3>
            <VideoProgress {...demoStates.processing} />
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-sm">Completed</h3>
            <VideoProgress {...demoStates.completed} />
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-sm">Failed</h3>
            <VideoProgress {...demoStates.failed} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engine Information</CardTitle>
          <CardDescription>
            Available video generation engines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Film className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium">Pika</h4>
              </div>
              <p className="text-sm text-gray-600">
                AI-powered video generation with text-to-video capabilities
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Film className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium">Runway</h4>
              </div>
              <p className="text-sm text-gray-600">
                Professional video generation with advanced controls
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Film className="h-5 w-5 text-green-600" />
                <h4 className="font-medium">D-ID</h4>
              </div>
              <p className="text-sm text-gray-600">
                Avatar-based video with lip-sync capabilities (Budget-friendly)
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Film className="h-5 w-5 text-orange-600" />
                <h4 className="font-medium">HeyGen</h4>
              </div>
              <p className="text-sm text-gray-600">
                Premium avatar videos with high quality output
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Generation Modal */}
      <VideoGenerationModal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          setTaskId(null)
        }}
        taskId={taskId}
        onVideoReady={(videoUrl) => {
          console.log('Video ready:', videoUrl)
        }}
      />
    </div>
  )
}
