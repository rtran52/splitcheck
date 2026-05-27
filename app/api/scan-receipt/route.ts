import { NextRequest, NextResponse } from 'next/server'
import { scanReceipt } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const { base64Image, mimeType } = await req.json()
    if (!base64Image || !mimeType) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 })
    }

    let receipt
    try {
      receipt = await scanReceipt(base64Image, mimeType)
    } catch (apiErr: unknown) {
      const msg = apiErr instanceof Error ? apiErr.message : 'api_error'
      if (msg === 'not_a_receipt') {
        return NextResponse.json({ error: 'not_a_receipt' }, { status: 422 })
      }
      return NextResponse.json({ error: 'api_error', message: msg }, { status: 502 })
    }

    return NextResponse.json(receipt)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to scan receipt'
    return NextResponse.json({ error: 'parse_error', message }, { status: 500 })
  }
}
