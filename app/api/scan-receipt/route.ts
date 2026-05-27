import { NextRequest, NextResponse } from 'next/server'
import { scanReceipt } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const { base64Image, mimeType } = await req.json()
    if (!base64Image || !mimeType) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 })
    }
    const receipt = await scanReceipt(base64Image, mimeType)
    return NextResponse.json(receipt)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to scan receipt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
