import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { chunkText } from '@/lib/file-processor'

export async function POST(request: Request) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get file metadata
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*, agent_id')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('agent-files')
      .download(file.storage_path)

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }

    // Convert blob to text
    const text = await fileData.text()

    // Process based on file type
    let processedText = text

    if (file.file_type === 'application/pdf') {
      // TODO: Implement PDF parsing with pdf-parse
      processedText = text
    } else if (file.file_type === 'text/csv') {
      // TODO: Implement CSV parsing
      processedText = text
    } else if (file.file_type === 'application/json') {
      try {
        const json = JSON.parse(text)
        processedText = JSON.stringify(json, null, 2)
      } catch (e) {
        processedText = text
      }
    }

    // Chunk the text
    const chunks = chunkText(processedText, 1000, 200) // 1000 chars, 200 overlap

    // Generate embeddings (optional - for semantic search)
    // const embeddings = await generateEmbeddings(chunks)

    // Save chunks to database
    const chunksToInsert = chunks.map((chunk, index) => ({
      file_id: fileId,
      content: chunk,
      chunk_index: index,
      metadata: {
        file_name: file.name,
        file_type: file.file_type
      }
    }))

    const { error: chunksError } = await supabase
      .from('file_chunks')
      .insert(chunksToInsert)

    if (chunksError) {
      throw new Error(`Failed to save chunks: ${chunksError.message}`)
    }

    // Update file status (if you add a 'processed' column later)
    // await supabase
    //   .from('files')
    //   .update({
    //     processed: true,
    //     chunk_count: chunks.length
    //   })
    //   .eq('id', fileId)

    return NextResponse.json({
      success: true,
      chunks: chunks.length,
      fileId
    })

  } catch (error: any) {
    console.error('File processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process file' },
      { status: 500 }
    )
  }
}
