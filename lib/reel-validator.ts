/**
 * Reel Scenario Validation Utilities
 * Validates draft reel scenarios before finalization
 */

export interface ReelScenario {
  hook: string
  body: string
  cta: string
  key_moments?: Array<{
    timing: string
    description: string
    text: string
  }>
  visual_suggestions?: {
    format?: string
    music_vibe?: string
  }
  hashtags?: string[]
}

export interface ValidationResult {
  hook_length_valid: boolean
  hook_char_count: number
  hook_word_count: number
  key_moments_valid: boolean
  key_moments_issues?: string[]
  cta_clear: boolean
  cta_issues?: string[]
  overall_valid: boolean
  suggestions: string[]
  warnings: string[]
}

/**
 * Validate hook length (should be 3-10 seconds worth of speech)
 * Average speaking rate: 2-3 words per second
 * So 3-10 seconds = 6-30 words or roughly 30-150 characters
 */
export function validateHookLength(hook: string): {
  valid: boolean
  charCount: number
  wordCount: number
  issues: string[]
} {
  const trimmed = hook.trim()
  const charCount = trimmed.length
  // Handle empty strings properly
  const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter(w => w.length > 0).length
  const issues: string[] = []

  // Character count should be 30-150 for a 3-10 second hook
  if (charCount < 30) {
    issues.push('Hook is too short (less than 30 characters). Aim for 3-10 seconds of speech.')
  } else if (charCount > 150) {
    issues.push('Hook is too long (more than 150 characters). Keep it under 10 seconds.')
  }

  // Word count should be 6-30 words
  if (wordCount < 6) {
    issues.push('Hook has too few words. Aim for at least 6 words.')
  } else if (wordCount > 30) {
    issues.push('Hook has too many words. Keep it under 30 words.')
  }

  return {
    valid: issues.length === 0,
    charCount,
    wordCount,
    issues
  }
}

/**
 * Validate key moments have proper timing
 */
export function validateKeyMoments(keyMoments?: Array<{ timing: string; description: string; text: string }>): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  if (!keyMoments || keyMoments.length === 0) {
    issues.push('No key moments defined. Add at least 2-3 key moments.')
    return { valid: false, issues }
  }

  if (keyMoments.length < 2) {
    issues.push('Add more key moments. Reels should have at least 2-3 key moments.')
  }

  // Validate timing format
  const timingRegex = /^\d+-\d+s$/
  keyMoments.forEach((moment, index) => {
    if (!moment.timing || !timingRegex.test(moment.timing)) {
      issues.push(`Key moment ${index + 1} has invalid timing format. Use format like "0-3s" or "3-15s".`)
    }

    if (!moment.description || moment.description.trim().length === 0) {
      issues.push(`Key moment ${index + 1} is missing a description.`)
    }

    if (!moment.text || moment.text.trim().length === 0) {
      issues.push(`Key moment ${index + 1} is missing text content.`)
    }
  })

  // Check for overlapping or gaps in timing
  const timings = keyMoments
    .filter(m => timingRegex.test(m.timing))
    .map(m => {
      const [start, end] = m.timing.replace('s', '').split('-').map(Number)
      return { start, end }
    })
    .sort((a, b) => a.start - b.start)

  for (let i = 0; i < timings.length - 1; i++) {
    if (timings[i].end > timings[i + 1].start) {
      issues.push(`Key moments ${i + 1} and ${i + 2} have overlapping timings.`)
    }
  }

  return {
    valid: issues.length === 0,
    issues
  }
}

// Common action words that drive engagement
const CTA_ACTION_WORDS = [
  'comment', 'share', 'follow', 'save', 'tag', 'dm', 'message', 
  'visit', 'check', 'click', 'watch', 'join', 'subscribe'
]

/**
 * Check CTA clarity
 */
export function validateCTA(cta: string): {
  valid: boolean
  issues: string[]
  suggestions: string[]
} {
  const issues: string[] = []
  const suggestions: string[] = []

  if (!cta || cta.trim().length === 0) {
    issues.push('CTA is required.')
    return { valid: false, issues, suggestions }
  }

  const charCount = cta.trim().length
  if (charCount < 10) {
    issues.push('CTA is too short. Be more specific about the action you want.')
  } else if (charCount > 200) {
    suggestions.push('CTA is quite long. Consider making it more concise.')
  }

  // Check for action words
  const hasActionWord = CTA_ACTION_WORDS.some(word => cta.toLowerCase().includes(word))

  if (!hasActionWord) {
    suggestions.push('Consider adding a clear action word like "comment", "share", "follow", or "save".')
  }

  // Check for question mark (questions drive engagement)
  const hasQuestion = cta.includes('?')
  if (!hasQuestion) {
    suggestions.push('Consider making your CTA a question to drive more engagement.')
  }

  return {
    valid: issues.length === 0,
    issues,
    suggestions
  }
}

/**
 * Generate improvement suggestions based on scenario
 */
export function generateSuggestions(scenario: ReelScenario): string[] {
  const suggestions: string[] = []

  // Hook suggestions
  if (scenario.hook && !scenario.hook.includes('?') && !scenario.hook.includes('!')) {
    suggestions.push('Consider adding emotion to your hook with a question or exclamation.')
  }

  // Check for personal pronouns to increase relatability
  const personalPronouns = ['you', 'your', 'we', 'us', 'our', 'i', 'my']
  const hookLower = scenario.hook?.toLowerCase() || ''
  const hasPersonalTouch = personalPronouns.some(pronoun => hookLower.includes(pronoun))

  if (!hasPersonalTouch) {
    suggestions.push('Try making your hook more personal by using "you", "your", or "we".')
  }

  // Body suggestions
  if (scenario.body && scenario.body.length < 50) {
    suggestions.push('Body content seems brief. Add more value or storytelling.')
  }

  // Visual suggestions
  if (!scenario.visual_suggestions?.format) {
    suggestions.push('Consider specifying a visual format (talking head, b-roll, text overlay).')
  }

  if (!scenario.visual_suggestions?.music_vibe) {
    suggestions.push('Add a music vibe suggestion to enhance the mood.')
  }

  // Hashtag suggestions
  if (!scenario.hashtags || scenario.hashtags.length === 0) {
    suggestions.push('Add relevant hashtags to improve discoverability.')
  } else if (scenario.hashtags.length > 10) {
    suggestions.push('Too many hashtags can look spammy. Aim for 5-10 focused hashtags.')
  }

  return suggestions
}

/**
 * Complete validation of reel scenario
 */
export function validateReelScenario(scenario: ReelScenario): ValidationResult {
  const hookValidation = validateHookLength(scenario.hook || '')
  const keyMomentsValidation = validateKeyMoments(scenario.key_moments)
  const ctaValidation = validateCTA(scenario.cta || '')

  const warnings: string[] = []
  const suggestions: string[] = [
    ...ctaValidation.suggestions,
    ...generateSuggestions(scenario)
  ]

  // Collect all issues as warnings
  if (!hookValidation.valid) {
    warnings.push(...hookValidation.issues)
  }
  if (!keyMomentsValidation.valid) {
    warnings.push(...keyMomentsValidation.issues)
  }
  if (!ctaValidation.valid) {
    warnings.push(...ctaValidation.issues)
  }

  return {
    hook_length_valid: hookValidation.valid,
    hook_char_count: hookValidation.charCount,
    hook_word_count: hookValidation.wordCount,
    key_moments_valid: keyMomentsValidation.valid,
    key_moments_issues: keyMomentsValidation.issues,
    cta_clear: ctaValidation.valid,
    cta_issues: ctaValidation.issues,
    overall_valid: hookValidation.valid && keyMomentsValidation.valid && ctaValidation.valid,
    suggestions,
    warnings
  }
}

/**
 * Calculate quality score based on validation and content
 */
export function calculateQualityScore(
  scenario: ReelScenario,
  validation: ValidationResult
): number {
  let score = 50 // Base score

  // Hook quality (max +20)
  if (validation.hook_length_valid) {
    score += 15
    // Bonus for question or exclamation
    if (scenario.hook?.includes('?') || scenario.hook?.includes('!')) {
      score += 5
    }
  }

  // Key moments quality (max +15)
  if (validation.key_moments_valid) {
    score += 10
    // Bonus for having 3+ key moments
    if (scenario.key_moments && scenario.key_moments.length >= 3) {
      score += 5
    }
  }

  // CTA quality (max +15)
  if (validation.cta_clear) {
    score += 10
    // Bonus for question-based CTA
    if (scenario.cta?.includes('?')) {
      score += 5
    }
  }

  // Visual suggestions (max +10)
  if (scenario.visual_suggestions?.format) {
    score += 5
  }
  if (scenario.visual_suggestions?.music_vibe) {
    score += 5
  }

  // Hashtags (max +10)
  if (scenario.hashtags && scenario.hashtags.length >= 3 && scenario.hashtags.length <= 10) {
    score += 10
  } else if (scenario.hashtags && scenario.hashtags.length > 0) {
    score += 5
  }

  // Penalize for warnings (max -20)
  score -= Math.min(validation.warnings.length * 5, 20)

  return Math.max(0, Math.min(100, score))
}
