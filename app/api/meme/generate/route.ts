import { NextResponse } from 'next/server'
import { POST as generateImagePOST } from '../generate-image/route'

export async function POST(request: Request) {
  // Redirect to new Sharp-based endpoint by calling it directly
  return generateImagePOST(request)
}
