import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url, title, content, comments, author, timestamp } = body
    
    // Validate
    if (!url || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Initialize Notion client
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    })
    
    const databaseId = process.env.NOTION_DATABASE_ID || '2e4d8e44d9158097bdd1d96c89f3fcf3'
    
    // Format comments
    const formattedComments = comments && comments.length > 0
      ? comments.map((c: string) => `• ${c}`).join('\n')
      : 'Brak komentarzy'
    
    // Create page in Notion
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        // Name/Title property
        Name: {
          title: [
            {
              text: {
                content: title || content.substring(0, 100) + '...',
              },
            },
          ],
        },
        // Treść property
        'Treść': {
          rich_text: [
            {
              text: {
                content: content,
              },
            },
          ],
        },
        // Komentarze property
        'Komentarze': {
          rich_text: [
            {
              text: {
                content: formattedComments,
              },
            },
          ],
        },
      },
    })
    
    return NextResponse.json({ 
      success: true, 
      notionPageId: response.id,
      message: 'Zapisano do Notion!' 
    })
    
  } catch (error: any) {
    console.error('Notion API error:', error)
    return NextResponse.json({ 
      error: 'Failed to save to Notion', 
      details: error.message 
    }, { status: 500 })
  }
}
