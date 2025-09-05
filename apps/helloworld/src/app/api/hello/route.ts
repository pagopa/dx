import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Hello from the API!',
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  return NextResponse.json({
    message: 'Hello from POST API!',
    timestamp: new Date().toISOString(),
    receivedData: body,
  })
}
