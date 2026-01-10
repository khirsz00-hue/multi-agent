import { Client } from '@notionhq/client'

export function getNotionClient() {
  if (!process.env.NOTION_API_KEY) {
    throw new Error('NOTION_API_KEY is not set')
  }
  
  return new Client({
    auth: process.env.NOTION_API_KEY,
  })
}

export const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || '2e4d8e44d9158097bdd1d96c89f3fcf3'
