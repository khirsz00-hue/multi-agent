import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Redirect to new Sharp-based endpoint
  const body = await request.json()
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/meme/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  
  return NextResponse.json(await res.json(), { status: res.status })
}
