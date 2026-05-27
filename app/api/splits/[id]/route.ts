import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()

    const { data: split, error: splitError } = await supabase
      .from('splits')
      .select('*')
      .eq('id', params.id)
      .single()

    if (splitError) throw splitError

    const { data: items } = await supabase
      .from('items')
      .select('*')
      .eq('split_id', params.id)

    const { data: people } = await supabase
      .from('people')
      .select('*')
      .eq('split_id', params.id)

    const itemIds = (items || []).map((i) => i.id)
    let assignments: unknown[] = []
    if (itemIds.length > 0) {
      const { data } = await supabase
        .from('assignments')
        .select('*')
        .in('item_id', itemIds)
      assignments = data || []
    }

    return NextResponse.json({ split, items: items || [], people: people || [], assignments })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch split'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const body = await req.json()

    if (body.type === 'add_person') {
      const { data, error } = await supabase
        .from('people')
        .insert({
          split_id: params.id,
          name: body.name,
          color: body.color,
          venmo_handle: null,
          cashapp_handle: null,
        })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(data)
    }

    if (body.type === 'assign_item') {
      const { item_id, person_id, share_fraction } = body

      if (share_fraction === 0) {
        await supabase
          .from('assignments')
          .delete()
          .eq('item_id', item_id)
          .eq('person_id', person_id)
        return NextResponse.json({ deleted: true })
      }

      const { data, error } = await supabase
        .from('assignments')
        .upsert({ item_id, person_id, share_fraction }, { onConflict: 'item_id,person_id' })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json(data)
    }

    if (body.type === 'complete') {
      const { error } = await supabase
        .from('splits')
        .update({ status: 'complete' })
        .eq('id', params.id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update split'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
