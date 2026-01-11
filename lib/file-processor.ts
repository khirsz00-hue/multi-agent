export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = []
  let startIndex = 0
  
  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length)
    const chunk = text.slice(startIndex, endIndex)
    chunks.push(chunk)
    
    startIndex += chunkSize - overlap
  }
  
  return chunks
}

export async function processFile(content: string, fileType: string): Promise<string> {
  // Add file type specific processing here
  switch (fileType) {
    case 'application/pdf':
      return await processPDF(content)
    case 'text/csv':
      return processCSV(content)
    case 'application/json':
      return processJSON(content)
    default:
      return content
  }
}

async function processPDF(content: string): Promise<string> {
  // TODO: Implement with pdf-parse library
  // For now, return as-is
  return content
}

function processCSV(content: string): string {
  // Basic CSV formatting - keep as-is for now
  // Future enhancement: Parse CSV with library like papaparse
  return content
}

function processJSON(content: string): string {
  try {
    const json = JSON.parse(content)
    return JSON.stringify(json, null, 2)
  } catch (e) {
    return content
  }
}
