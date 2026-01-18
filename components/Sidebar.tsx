"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  FileEdit, 
  Calendar, 
  BarChart3, 
  Settings, 
  Image,
  Video,
  FileText,
  CalendarCheck,
  TrendingUp,
  Key,
  User,
  LogOut,
  Plus,
  Eye
} from 'lucide-react'
import SignOutButton from './SignOutButton'

interface SidebarProps {
  user?: any
  className?: string
}

const menuItems = [
  {
    section: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { label: 'My Spaces', href: '/spaces', icon: LayoutDashboard },
    ]
  },
  {
    section: 'Content Creation',
    icon: FileEdit,
    items: [
      { label: 'Generate Meme/Post', href: '/quick-generate', icon: Image },
      { label: 'Generate Reel/Short', href: '/quick-editor', icon: Video },
      { label: 'Content Calendar', href: '/dashboard/content-calendar', icon: CalendarCheck },
    ]
  },
  {
    section: 'Calendar & Planning',
    icon: Calendar,
    items: [
      { label: 'Monthly View', href: '/dashboard/content-calendar', icon: Calendar },
      { label: 'Publishing Schedule', href: '/dashboard/content-calendar#schedule', icon: CalendarCheck },
    ]
  },
  {
    section: 'Analytics',
    icon: BarChart3,
    items: [
      { label: 'Performance', href: '/analytics', icon: TrendingUp },
      { label: 'Insights', href: '/analytics#insights', icon: BarChart3 },
    ]
  },
  {
    section: 'Settings',
    icon: Settings,
    items: [
      { label: 'Brand Settings', href: '/settings/brand', icon: Settings },
      { label: 'Agent Config', href: '/agents', icon: Settings },
      { label: 'API Keys', href: '/settings/api', icon: Key },
    ]
  },
]

export default function Sidebar({ user, className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn("flex flex-col h-full bg-white border-r", className)}>
      {/* Logo */}
      <div className="p-4 border-b">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg" />
          <span className="font-bold text-lg">Multi-Agent</span>
        </Link>
      </div>

      {/* Quick Access Buttons */}
      <div className="p-4 space-y-2 border-b">
        <Link href="/quick-generate" className="w-full">
          <Button className="w-full justify-start" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Meme
          </Button>
        </Link>
        <Link href="/quick-editor" className="w-full">
          <Button className="w-full justify-start" variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Reel
          </Button>
        </Link>
        <Link href="/dashboard/content-calendar" className="w-full">
          <Button className="w-full justify-start" variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            View Calendar
          </Button>
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {menuItems.map((section) => (
            <div key={section.section}>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <section.icon className="h-4 w-4" />
                {section.section}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || 
                    (item.href.includes('#') && pathname === item.href.split('#')[0])
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                          isActive 
                            ? "bg-blue-50 text-blue-700 font-medium" 
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* User Profile Section */}
      {user && (
        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/settings" className="flex-1">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <User className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  )
}
