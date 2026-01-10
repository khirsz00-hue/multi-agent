'use client'

import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { signOut } from '@/lib/auth'

export default function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signOut()}
    >
      <LogOut className="h-4 w-4 mr-2" />
      <span className="hidden sm:inline">Sign Out</span>
    </Button>
  )
}
