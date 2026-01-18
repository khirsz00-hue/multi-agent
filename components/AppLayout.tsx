"use client"

import { useState } from 'react'
import Sidebar from './Sidebar'
import { Button } from './ui/button'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from './ui/sheet'

interface AppLayoutProps {
  children: React.ReactNode
  user?: any
}

export default function AppLayout({ children, user }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
        <Sidebar user={user} />
      </aside>

      {/* Mobile Sidebar - Sheet Drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden fixed top-4 left-4 z-40"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar user={user} />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 overflow-y-auto">
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </main>
    </div>
  )
}
