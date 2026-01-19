import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderOpen, Bot, Upload, MessageSquare } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // If user is logged in, redirect to spaces dashboard
  if (user) {
    redirect('/spaces')
  }
  
  // If not logged in, redirect to login
  redirect('/login')
}
