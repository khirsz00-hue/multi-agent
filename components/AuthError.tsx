'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'

interface AuthErrorProps {
  message: string
  onDismiss?: () => void
  autoHideDuration?: number
}

export default function AuthError({ 
  message, 
  onDismiss, 
  autoHideDuration = 5000 
}: AuthErrorProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        if (onDismiss) onDismiss()
      }, autoHideDuration)

      return () => clearTimeout(timer)
    }
  }, [autoHideDuration, onDismiss])

  if (!isVisible) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-red-800">{message}</p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false)
          if (onDismiss) onDismiss()
        }}
        className="text-red-600 hover:text-red-800 flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function getAuthErrorMessage(error: any): string {
  const errorMessage = error?.message || ''
  
  if (errorMessage.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.'
  }
  
  if (errorMessage.includes('User already registered')) {
    return 'An account with this email already exists. Please sign in instead.'
  }
  
  if (errorMessage.includes('Password should be at least')) {
    return 'Password must be at least 6 characters long.'
  }
  
  if (errorMessage.includes('Email not confirmed')) {
    return 'Please confirm your email address before signing in.'
  }

  if (errorMessage.includes('Invalid email')) {
    return 'Please enter a valid email address.'
  }
  
  return errorMessage || 'An unexpected error occurred. Please try again.'
}
