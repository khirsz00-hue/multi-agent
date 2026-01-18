'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar,
  FileText,
  Users,
  Target,
  TrendingUp,
  Bell,
  Clock,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardSidebarProps {
  spaceId?: string
}

interface UpcomingContent {
  id: string
  title: string
  scheduled_date: string
  status: string
}

export default function DashboardSidebar({ spaceId }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [dueContent, setDueContent] = useState<UpcomingContent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUpcomingContent()
  }, [])

  const loadUpcomingContent = async () => {
    try {
      const res = await fetch('/api/content/calendar')
      if (!res.ok) throw new Error('Failed to load content')
      
      const data = await res.json()
      const calendar = data.calendar
      
      // Count upcoming scheduled items
      const scheduled = calendar?.scheduled || []
      setUpcomingCount(scheduled.length)
      
      // Find content due soon (within 24 hours)
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      
      const due = scheduled.filter((item: any) => {
        const publishDate = new Date(item.scheduled_date)
        return publishDate >= now && publishDate <= tomorrow
      })
      
      setDueContent(due)
    } catch (error) {
      console.error('Failed to load upcoming content:', error)
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    {
      label: 'Dashboard',
      icon: TrendingUp,
      href: spaceId ? `/spaces/${spaceId}` : '/dashboard',
      badge: null
    },
    {
      label: 'Content Calendar',
      icon: Calendar,
      href: '/dashboard/content-calendar',
      badge: upcomingCount > 0 ? upcomingCount : null,
      highlight: dueContent.length > 0
    },
    {
      label: 'Long Form Editor',
      icon: FileText,
      href: '/dashboard/long-form-editor',
      badge: null
    },
    {
      label: 'Audience Insights',
      icon: Users,
      href: spaceId ? `/spaces/${spaceId}#audience` : '/dashboard/audience',
      badge: null
    },
    {
      label: 'KPI Tracker',
      icon: Target,
      href: spaceId ? `/spaces/${spaceId}#kpi` : '/dashboard/kpi',
      badge: null
    }
  ]

  return (
    <div className="w-64 min-h-screen bg-gray-50 border-r border-gray-200 p-4 space-y-4">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  item.highlight && !isActive && 'border-orange-500 border-2 bg-orange-50'
                )}
              >
                <Icon className="h-4 w-4 mr-2" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== null && (
                  <Badge 
                    variant={item.highlight ? 'destructive' : 'secondary'}
                    className="ml-2"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          )
        })}
      </div>

      {/* Due Content Alert */}
      {dueContent.length > 0 && (
        <Card className="border-orange-500 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 mb-3">
              <Bell className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-orange-900">
                  Content Due Soon
                </h3>
                <p className="text-xs text-orange-700 mt-1">
                  {dueContent.length} item{dueContent.length !== 1 ? 's' : ''} scheduled in the next 24 hours
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              {dueContent.slice(0, 3).map((item) => (
                <div 
                  key={item.id} 
                  className="text-xs bg-white rounded p-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Clock className="h-3 w-3 text-gray-500 flex-shrink-0" />
                    <span className="truncate">
                      {item.title || 'Untitled'}
                    </span>
                  </div>
                  <span className="text-gray-500 text-[10px] ml-2 flex-shrink-0">
                    {new Date(item.scheduled_date).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
            </div>

            {dueContent.length > 3 && (
              <p className="text-xs text-orange-700 mt-2 text-center">
                +{dueContent.length - 3} more
              </p>
            )}

            <Link href="/dashboard/content-calendar">
              <Button 
                size="sm" 
                className="w-full mt-3 bg-orange-600 hover:bg-orange-700"
              >
                View Calendar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Content Summary */}
      {!loading && upcomingCount > 0 && dueContent.length === 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-sm">Upcoming Content</h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              {upcomingCount} item{upcomingCount !== 1 ? 's' : ''} scheduled
            </p>
            <Link href="/dashboard/content-calendar">
              <Button variant="outline" size="sm" className="w-full">
                View All
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
