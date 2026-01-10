import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileId } = await req.json()

    if (!fileId) {
      throw new Error('File ID is required')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get file metadata
    const { data: file, error: fileError } = await supabaseClient
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError) throw fileError

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('agent-files')
      .download(file.storage_path)

    if (downloadError) throw downloadError

    // Read file content
    const fileContent = await fileData.text()

    // Simple chunking - split by paragraphs or every 1000 characters
    const chunks: string[] = []
    const chunkSize = 1000
    
    // Split into chunks
    for (let i = 0; i < fileContent.length; i += chunkSize) {
      const chunk = fileContent.substring(i, i + chunkSize)
      chunks.push(chunk)
    }

    // Generate embeddings and save chunks
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      // Generate embedding using OpenAI
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: chunk,
        }),
      })

      const embeddingData = await embeddingResponse.json()
      const embedding = embeddingData.data[0].embedding

      // Save chunk with embedding
      const { error: chunkError } = await supabaseClient
        .from('file_chunks')
        .insert({
          file_id: fileId,
          content: chunk,
          embedding: embedding,
          chunk_index: i,
        })

      if (chunkError) throw chunkError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunks: chunks.length,
        message: 'File processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
