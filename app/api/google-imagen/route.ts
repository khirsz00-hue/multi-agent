// TODO: Implement when Google Imagen API is available
// Requires: @google/genai SDK

export async function POST(request: Request) {
  // Placeholder - returns error for now
  return Response.json({ 
    error: 'Google Imagen not yet implemented. Using DALL-E fallback.' 
  }, { status: 501 })
}
