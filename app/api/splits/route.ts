import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateShareCode } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const body = await req.json()

    const { data: split, error: splitError } = await supabase
      .from('splits')
      .insert({
        restaurant_name: body.restaurant_name || null,
        subtotal: body.subtotal,
        tax: body.tax,
        tip: body.tip,
        total: body.total,
        currency: body.currency || 'USD',
        share_code: generateShareCode(),
        status: 'assigning',
      })
      .select()
      .single()

    if (splitError) throw splitError

    const itemsToInsert = body.items.map((item: { name: string; price: number }) => ({
      split_id: split.id,
      name: item.name,
      price: item.price,
    }))

    const { error: itemsError } = await supabase.from('items').insert(itemsToInsert)
    if (itemsError) throw itemsError

    return NextResponse.json({ split_id: split.id, share_code: split.share_code })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create split'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
