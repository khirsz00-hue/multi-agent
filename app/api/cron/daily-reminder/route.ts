import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDailyReminder } from '@/lib/email-notifications'

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// Run daily at 8 AM

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = await createClient()
    
    // Get all content executor agents
    const { data: agents } = await supabase
      .from('agents')
      .select('*, spaces(user_id, users(email))')
      .eq('role', 'content_executor')
    
    if (!agents || agents.length === 0) {
      return NextResponse.json({ message: 'No content executors found' })
    }
    
    const results = []
    
    for (const agent of agents) {
      const userEmail = agent.spaces?.users?.email
      if (!userEmail) continue
      
      // Get today's content
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agents/content-executor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          action: 'get_today'
        })
      })
      
      const data = await response.json()
      
      if (data.today) {
        await sendDailyReminder({
          userEmail: userEmail,
          todayContent: data.today,
          kpiProgress: data.kpi_progress
        })
        
        results.push({ agent_id: agent.id, sent: true })
      }
    }
    
    return NextResponse.json({
      success: true,
      sent: results.length,
      results: results
    })
    
  } catch (error: any) {
    console.error('Daily reminder error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
