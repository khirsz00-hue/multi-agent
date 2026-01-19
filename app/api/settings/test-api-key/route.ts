import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { service, apiKey } = await request.json()

    let success = false
    let error = null

    switch (service) {
      case 'openai':
      case 'dall-e':
        try {
          const openai = new OpenAI({ apiKey })
          await openai.models.list()
          success = true
        } catch (e: any) {
          error = e.message
        }
        break

      case 'd-id':
        try {
          const res = await fetch('https://api.d-id.com/credits', {
            headers: { 'Authorization': apiKey }
          })
          success = res.ok
          if (!success) error = await res.text()
        } catch (e: any) {
          error = e.message
        }
        break

      case 'notion':
        try {
          const res = await fetch('https://api.notion.com/v1/users/me', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Notion-Version': '2022-06-28'
            }
          })
          success = res.ok
          if (!success) error = await res.text()
        } catch (e: any) {
          error = e.message
        }
        break

      // Add more services as needed
      default:
        success = true // Skip test for unknown services
    }

    return NextResponse.json({ success, error })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
