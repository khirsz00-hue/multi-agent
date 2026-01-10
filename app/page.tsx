import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, FolderOpen, MessageSquare, Upload } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Multi-Agent Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Create and manage AI agents with custom workspaces, file uploads, and intelligent conversations
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/spaces">
              <Button size="lg" className="text-lg px-8">
                Get Started
              </Button>
            </Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Docs
              </Button>
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <FolderOpen className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Workspaces</CardTitle>
              <CardDescription>
                Organize your agents in dedicated spaces
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Bot className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>AI Agents</CardTitle>
              <CardDescription>
                Create custom agents with multiple LLM providers
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Upload className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>File Upload</CardTitle>
              <CardDescription>
                Upload documents for AI-powered analysis
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="h-10 w-10 text-orange-600 mb-2" />
              <CardTitle>Smart Chat</CardTitle>
              <CardDescription>
                Converse with agents using RAG technology
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Tech Stack */}
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Powered By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="font-semibold">Next.js 14</p>
                  <p className="text-sm text-gray-500">Frontend</p>
                </div>
                <div>
                  <p className="font-semibold">Supabase</p>
                  <p className="text-sm text-gray-500">Backend</p>
                </div>
                <div>
                  <p className="font-semibold">OpenAI/Claude</p>
                  <p className="text-sm text-gray-500">AI Models</p>
                </div>
                <div>
                  <p className="font-semibold">pgvector</p>
                  <p className="text-sm text-gray-500">Vector DB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2024 Multi-Agent Platform. Built with Next.js and Supabase.</p>
        </div>
      </footer>
    </div>
  )
}
