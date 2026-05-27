import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateShareCode } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { name } = await req.json()
    const { data, error } = await supabase
      .from('trips')
      .insert({ name, share_code: generateShareCode() })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create trip'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
