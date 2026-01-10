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
}

export function FileUploader({ agentId, onFileUploaded }: FileUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const supabase = createClient()

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
    const newUploadingFiles = files.map(file => ({ file, progress: 0 }))
    setUploadingFiles(prev => [...prev, ...newUploadingFiles])

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        // Upload to Supabase Storage
        const filePath = `${agentId}/${Date.now()}_${file.name}`
        const { data: storageData, error: storageError } = await supabase.storage
          .from('agent-files')
          .upload(filePath, file, {
            onUploadProgress: (progress) => {
              const percentage = (progress.loaded / progress.total) * 100
              setUploadingFiles(prev =>
                prev.map((f, idx) =>
                  idx === i ? { ...f, progress: percentage } : f
                )
              )
            },
          })

        if (storageError) throw storageError

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
        setUploadingFiles(prev => prev.filter((_, idx) => idx !== i))

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
      } catch (error) {
        console.error('Upload error:', error)
        setUploadingFiles(prev =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, error: error instanceof Error ? error.message : 'Upload failed' }
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
