import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('process-file', {
      body: { fileId },
    })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Process file API error:', error)
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    )
  }
}
