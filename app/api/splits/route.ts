import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateShareCode, getAvatarColor } from '@/lib/utils'

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
        status: body.evenSplit ? 'complete' : 'assigning',
      })
      .select()
      .single()

    if (splitError) throw splitError

    if (body.evenSplit && body.person_count) {
      // Even split: create a single "Total" item and N generic people with equal assignments
      const { data: totalItem, error: itemErr } = await supabase
        .from('items')
        .insert({ split_id: split.id, name: 'Total', price: body.total })
        .select()
        .single()
      if (itemErr) throw itemErr

      const peopleToInsert = Array.from({ length: body.person_count }, (_, i) => ({
        split_id: split.id,
        name: `Person ${i + 1}`,
        color: getAvatarColor(i),
        venmo_handle: null,
        cashapp_handle: null,
      }))
      const { data: createdPeople, error: peopleErr } = await supabase
        .from('people')
        .insert(peopleToInsert)
        .select()
      if (peopleErr) throw peopleErr

      const assignmentsToInsert = (createdPeople || []).map((p) => ({
        item_id: totalItem.id,
        person_id: p.id,
        share_fraction: 1 / body.person_count,
      }))
      const { error: assignErr } = await supabase.from('assignments').insert(assignmentsToInsert)
      if (assignErr) throw assignErr
    } else {
      // Normal split: create individual items
      const itemsToInsert = body.items.map((item: { name: string; price: number }) => ({
        split_id: split.id,
        name: item.name,
        price: item.price,
      }))
      const { error: itemsError } = await supabase.from('items').insert(itemsToInsert)
      if (itemsError) throw itemsError
    }

    return NextResponse.json({ split_id: split.id, share_code: split.share_code })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create split'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
