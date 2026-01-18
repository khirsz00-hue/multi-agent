'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface SpaceBreadcrumbsProps {
  space: any
}

export function SpaceBreadcrumbs({ space }: SpaceBreadcrumbsProps) {
  const pathname = usePathname()
  
  const pathSegments = pathname.split('/').filter(Boolean)
  
  const breadcrumbs = []
  
  // Home
  breadcrumbs.push({
    name: space.name,
    href: `/spaces/${space.id}/agents`,
    icon: Home
  })
  
  // Parse path
  if (pathSegments.includes('content')) {
    breadcrumbs.push({
      name: 'Content Creator',
      href: null
    })
    
    const contentType = pathSegments[pathSegments.indexOf('content') + 1]
    const contentNames: Record<string, string> = {
      memes: 'Kreator Memów',
      reels: 'Kreator Reels',
      shorts: 'Kreator Shorts',
      posts: 'Kreator Postów',
      newsletter: 'Kreator Newslettera'
    }
    
    if (contentType && contentNames[contentType]) {
      breadcrumbs.push({
        name: contentNames[contentType],
        href: `/spaces/${space.id}/content/${contentType}`
      })
    }
  } else if (pathSegments.includes('insights')) {
    breadcrumbs.push({
      name: 'Audience Insights',
      href: `/spaces/${space.id}/insights`
    })
  } else if (pathSegments.includes('calendar')) {
    breadcrumbs.push({
      name: 'Calendar & Planning',
      href: `/spaces/${space.id}/calendar`
    })
  }
  
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <nav className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />}
            
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
              >
                {crumb.icon && <crumb.icon className="h-4 w-4" />}
                <span>{crumb.name}</span>
              </Link>
            ) : (
              <span className="text-gray-400">{crumb.name}</span>
            )}
          </div>
        ))}
      </nav>
    </div>
  )
}
