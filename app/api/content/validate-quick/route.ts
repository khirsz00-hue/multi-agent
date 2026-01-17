import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { contentType, draft } = await request.json()
    
    if (!['engagement_post', 'thread'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      )
    }
    
    const validation = validateContent(contentType, draft)
    
    return NextResponse.json({ 
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    })
  } catch (error: any) {
    console.error('Validation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function validateContent(contentType: string, draft: any) {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (contentType === 'engagement_post') {
    // Validate engagement post
    if (!draft.hook || draft.hook.trim().length === 0) {
      errors.push('Hook is required')
    } else if (draft.hook.length > 150) {
      errors.push('Hook should be 150 characters or less')
    }
    
    if (!draft.body || draft.body.trim().length === 0) {
      errors.push('Body is required')
    } else {
      const wordCount = draft.body.trim().split(/\s+/).length
      if (wordCount < 10) {
        warnings.push('Body might be too short (less than 10 words)')
      } else if (wordCount > 150) {
        warnings.push('Body might be too long (more than 150 words)')
      }
    }
    
    if (!draft.cta || draft.cta.trim().length === 0) {
      warnings.push('CTA is recommended for better engagement')
    } else if (draft.cta.length > 150) {
      errors.push('CTA should be 150 characters or less')
    }
    
    if (!draft.hashtags || draft.hashtags.length === 0) {
      warnings.push('At least one hashtag is recommended')
    } else if (draft.hashtags.length > 10) {
      warnings.push('Too many hashtags (more than 10)')
    }
    
  } else if (contentType === 'thread') {
    // Validate thread
    if (!draft.tweets || !Array.isArray(draft.tweets)) {
      errors.push('Tweets array is required')
    } else {
      if (draft.tweets.length < 2) {
        errors.push('Thread must have at least 2 tweets')
      } else if (draft.tweets.length > 25) {
        warnings.push('Very long thread (more than 25 tweets)')
      }
      
      draft.tweets.forEach((tweet: string, index: number) => {
        if (!tweet || tweet.trim().length === 0) {
          errors.push(`Tweet ${index + 1} is empty`)
        } else if (tweet.length > 280) {
          errors.push(`Tweet ${index + 1} exceeds 280 characters (${tweet.length} chars)`)
        } else if (tweet.length > 260) {
          warnings.push(`Tweet ${index + 1} is close to limit (${tweet.length}/280 chars)`)
        }
      })
    }
    
    if (!draft.hashtags || draft.hashtags.length === 0) {
      warnings.push('At least one hashtag is recommended')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
