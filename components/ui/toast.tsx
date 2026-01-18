'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

// Fallback UUID generation for older browsers
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback to timestamp + random
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const timeoutRefs = React.useRef<Map<string, NodeJS.Timeout>>(new Map())

  const showToast = React.useCallback((message: string, type: ToastType = 'info') => {
    const id = generateId()
    setToasts(prev => [...prev, { id, message, type }])
    
    // Auto-remove after 5 seconds
    const timeout = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timeoutRefs.current.delete(id)
    }, 5000)
    
    timeoutRefs.current.set(id, timeout)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timeout = timeoutRefs.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeoutRefs.current.delete(id)
    }
  }, [])

  // Cleanup on unmount
  React.useEffect(() => {
    const timeouts = timeoutRefs.current
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
      timeouts.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg transition-all animate-in slide-in-from-right',
              {
                'bg-green-50 border border-green-200 text-green-800': toast.type === 'success',
                'bg-red-50 border border-red-200 text-red-800': toast.type === 'error',
                'bg-blue-50 border border-blue-200 text-blue-800': toast.type === 'info',
              }
            )}
          >
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 hover:opacity-70 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
