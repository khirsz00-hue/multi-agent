import { Client } from '@notionhq/client'

export function getNotionClient() {
  if (!process.env.NOTION_API_KEY) {
    throw new Error('NOTION_API_KEY is not set')
  }
  
  return new Client({
    auth: process.env.NOTION_API_KEY,
  })
}

export function getNotionDatabaseId() {
  if (!process.env.NOTION_DATABASE_ID) {
    throw new Error('NOTION_DATABASE_ID is not set')
  }
  return process.env.NOTION_DATABASE_ID
}
