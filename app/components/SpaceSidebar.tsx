'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Bot,
  Sparkles,
  Laugh,
  Video,
  FileText,
  Mail,
  Users,
  Calendar,
  Palette,
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SpaceSidebarProps {
  space: any
}

export function SpaceSidebar({ space }: SpaceSidebarProps) {
  const pathname = usePathname()
  const [contentCreatorOpen, setContentCreatorOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigation = [
    {
      name: 'Agenci',
      href: `/spaces/${space.id}/agents`,
      icon: Bot,
      default: true
    },
    {
      name: 'Brand Settings',
      href: `/spaces/${space.id}/brand-settings`,
      icon: Palette
    },
    {
      name: 'Content Creator',
      icon: Sparkles,
      children: [
        {
          name: 'Kreator Memów',
          href: `/spaces/${space.id}/content/memes`,
          icon: Laugh
        },
        {
          name: 'Kreator Reels',
          href: `/spaces/${space.id}/content/reels`,
          icon: Video
        },
        {
          name: 'Kreator Shorts',
          href: `/spaces/${space.id}/content/shorts`,
          icon: Video
        },
        {
          name: 'Kreator Postów',
          href: `/spaces/${space.id}/content/posts`,
          icon: FileText
        },
        {
          name: 'Kreator Newslettera',
          href: `/spaces/${space.id}/content/newsletter`,
          icon: Mail
        }
      ]
    },
    {
      name: 'Audience Insights',
      href: `/spaces/${space.id}/insights`,
      icon: Users
    },
    {
      name: 'Calendar & Planning',
      href: `/spaces/${space.id}/calendar`,
      icon: Calendar
    }
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{space.name}</h2>
            <p className="text-sm text-gray-500">{space.niche || space.description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <div key={item.name}>
            {item.children ? (
              // Parent with children (Content Creator)
              <div>
                <button
                  onClick={() => setContentCreatorOpen(!contentCreatorOpen)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    'hover:bg-gray-100 text-gray-700'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                  {contentCreatorOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {contentCreatorOpen && (
                  <div className="mt-1 ml-4 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                          pathname === child.href
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        <child.icon className="h-4 w-4" />
                        <span>{child.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Single item
              <Link
                href={item.href!}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">Pro Tip</span>
          </div>
          <p className="text-xs opacity-90">
            Wybierz insight z Notion lub wpisz własny, aby rozpocząć tworzenie contentu!
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'w-72 bg-white border-r border-gray-200 flex-shrink-0',
          'fixed lg:static inset-y-0 left-0 z-40 transform transition-transform',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
