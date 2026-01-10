"use client"

import React, { useState, useCallback } from 'react'
import { Upload, X, File as FileIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

interface FileUploaderProps {
  agentId: string
  onFileUploaded?: (file: any) => void
}

interface UploadingFile {
  file: File
  progress: number
  error?: string
  id: string // Unique identifier for tracking
}

// Emoji Unicode ranges to remove from filenames
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F9E0}]/gu

// Sanitize filename to remove emoji and special characters
function sanitizeFileName(fileName: string): string {
  // Remove emoji using expanded Unicode ranges
  const nameWithoutEmoji = fileName.replace(EMOJI_REGEX, '')
  
  // Replace spaces with underscores
  const nameWithUnderscores = nameWithoutEmoji.replace(/\s+/g, '_')
  
  // Remove any remaining special characters except dots, dashes, underscores
  const cleanName = nameWithUnderscores.replace(/[^a-zA-Z0-9._-]/g, '')
  
  // Ensure the name isn't empty
  if (!cleanName || cleanName === '.') {
    return `file_${Date.now()}.bin`
  }
  
  return cleanName
}

export function FileUploader({ agentId, onFileUploaded }: FileUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const supabase = createClient()
  
  // Maximum file size: 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files))
    }
  }, [])

  const handleFiles = async (files: File[]) => {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('Please sign in to upload files')
      return
    }

    const newUploadingFiles = files.map(file => ({ 
      file, 
      progress: 0,
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`
    }))
    setUploadingFiles(prev => [...prev, ...newUploadingFiles])

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const uploadId = newUploadingFiles[i].id
      
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setUploadingFiles(prev =>
          prev.map((f) =>
            f.id === uploadId
              ? { ...f, error: 'File too large (max 10MB)', progress: 0 }
              : f
          )
        )
        continue
      }
      
      try {
        // Sanitize filename
        const sanitizedFileName = sanitizeFileName(file.name)
        
        // Use userId in path to match RLS policies
        const filePath = `${user.id}/${agentId}/${Date.now()}_${sanitizedFileName}`
        
        // Update progress to show upload starting
        setUploadingFiles(prev =>
          prev.map((f) =>
            f.id === uploadId
              ? { ...f, progress: 50 }
              : f
          )
        )
        
        const { data: storageData, error: storageError } = await supabase.storage
          .from('agent-files')
          .upload(filePath, file)

        if (storageError) throw storageError

        // Update progress to show upload complete
        setUploadingFiles(prev =>
          prev.map((f) =>
            f.id === uploadId
              ? { ...f, progress: 100 }
              : f
          )
        )

        // Save file metadata to database
        const { data: fileData, error: dbError } = await supabase
          .from('files')
          .insert({
            agent_id: agentId,
            name: file.name,
            storage_path: filePath,
            file_type: file.type,
            file_size: file.size,
          })
          .select()
          .single()

        if (dbError) throw dbError

        // Remove from uploading list
        setUploadingFiles(prev => 
          prev.filter((f) => f.id !== uploadId)
        )

        // Call callback
        if (onFileUploaded) {
          onFileUploaded(fileData)
        }

        // Trigger file processing (Edge Function)
        await fetch('/api/process-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: fileData.id }),
        })
      } catch (error: any) {
        console.error('Upload error:', error)
        
        // Provide detailed error messages
        let errorMessage = 'Failed to upload file'
        
        if (error.message?.includes('Invalid key')) {
          errorMessage = 'Invalid file name. Please use only letters, numbers, and basic punctuation.'
        } else if (error.message?.includes('row-level security')) {
          errorMessage = 'Permission denied. Please make sure you are logged in.'
        } else if (error.message?.includes('not found')) {
          errorMessage = 'Storage bucket not configured. Please contact support.'
        } else if (error.message) {
          errorMessage = error.message
        }
        
        // Update UI with error
        setUploadingFiles(prev =>
          prev.map((f) =>
            f.id === uploadId
              ? { ...f, error: errorMessage, progress: 0 }
              : f
          )
        )
      }
    }
  }

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, idx) => idx !== index))
  }

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          onChange={handleChange}
          className="sr-only"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center space-y-2"
        >
          <Upload className="h-10 w-10 text-gray-400" />
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-primary">Click to upload</span> or
            drag and drop
          </div>
          <p className="text-xs text-gray-500">
            PDF, TXT, MD, CSV, JSON (MAX. 10MB)
          </p>
        </label>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FileIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium">{item.file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {item.error ? (
                <p className="text-xs text-destructive">{item.error}</p>
              ) : (
                <Progress value={item.progress} />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
