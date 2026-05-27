import Anthropic from '@anthropic-ai/sdk'
import { ParsedReceipt } from './types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const SYSTEM_PROMPT = `You are a receipt scanning AI. Your only job is to extract structured data from receipt images and return it as valid JSON.

RULES:
- Always return valid JSON. No markdown, no backticks, no explanation — just raw JSON.
- If a field is missing from the receipt, use 0 for numbers and null for strings.
- Prices must be numbers (not strings). Example: 12.50 not "$12.50"
- Items must be individual food/drink line items only. Ignore subtotals, taxes, tips, totals, and non-item lines.
- If the receipt is blurry or rotated, do your best to extract what you can.
- If the image is not a receipt, return: {"error": "not_a_receipt"}
- For currency, detect from the symbol: "$" = USD, "£" = GBP, "€" = EUR. Default to USD.
- If no tip line exists, set tip to 0.
- Item names should be clean and readable. Remove item codes and PLU numbers.

OUTPUT FORMAT — return exactly this shape, nothing else:
{
  "restaurant_name": "string or null",
  "items": [
    { "name": "string", "price": number }
  ],
  "subtotal": number,
  "tax": number,
  "tip": number,
  "total": number,
  "currency": "USD"
}`

export async function scanReceipt(base64Image: string, mimeType: string): Promise<ParsedReceipt> {
  const response = await client.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: 'Extract all receipt data from this image and return it as JSON following the exact format specified.',
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)

  if (parsed.error) throw new Error(parsed.error)

  return parsed as ParsedReceipt
}
