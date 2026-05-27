import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()

    const { data: trip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', params.id)
      .single()
    if (error) throw error

    const { data: tripSplits } = await supabase
      .from('trip_splits')
      .select('*')
      .eq('trip_id', params.id)

    const splitIds = (tripSplits || []).map((ts) => ts.split_id)
    let splits: unknown[] = []
    if (splitIds.length > 0) {
      const { data } = await supabase
        .from('splits')
        .select('*')
        .in('id', splitIds)
      splits = data || []
    }

    // Fetch people for all splits to calculate combined totals
    let allPeople: unknown[] = []
    let allItems: unknown[] = []
    let allAssignments: unknown[] = []
    if (splitIds.length > 0) {
      const { data: pData } = await supabase
        .from('people')
        .select('*')
        .in('split_id', splitIds)
      allPeople = pData || []

      const { data: iData } = await supabase
        .from('items')
        .select('*')
        .in('split_id', splitIds)
      allItems = iData || []

      const itemIds = (allItems as { id: string }[]).map((i) => i.id)
      if (itemIds.length > 0) {
        const { data: aData } = await supabase
          .from('assignments')
          .select('*')
          .in('item_id', itemIds)
        allAssignments = aData || []
      }
    }

    return NextResponse.json({ trip, splits, people: allPeople, items: allItems, assignments: allAssignments })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch trip'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { split_id, action } = await req.json()

    if (action === 'add_split') {
      const { error } = await supabase
        .from('trip_splits')
        .insert({ trip_id: params.id, split_id })
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'remove_split') {
      const { error } = await supabase
        .from('trip_splits')
        .delete()
        .eq('trip_id', params.id)
        .eq('split_id', split_id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update trip'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
