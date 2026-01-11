import { NextResponse } from 'next/server'
import { getNotionClient, getNotionDatabaseId } from '@/lib/notion'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url, title, content, comments, author, timestamp } = body
    
    // Validate
    if (!url || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Initialize Notion client using helper
    const notion = getNotionClient()
    const databaseId = getNotionDatabaseId()
    
    // Format comments
    const formattedComments = comments && comments.length > 0
      ? comments.map((c: string) => `• ${c}`).join('\n')
      : 'No comments'
    
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
