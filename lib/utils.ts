import { Assignment, PersonTotal, Person, ReceiptItem } from './types'

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function generateShareCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const AVATAR_COLORS = [
  '#7F77DD', '#1D9E75', '#D85A30', '#D4537E',
  '#378ADD', '#639922', '#BA7517', '#E24B4A',
]

export function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function calculatePersonTotals(
  people: Person[],
  items: ReceiptItem[],
  assignments: Assignment[],
  tax: number,
  tip: number
): PersonTotal[] {
  const totals: PersonTotal[] = people.map((person) => {
    const personAssignments = assignments.filter((a) => a.person_id === person.id)
    let itemsTotal = 0
    personAssignments.forEach((assignment) => {
      const item = items.find((i) => i.id === assignment.item_id)
      if (item) itemsTotal += item.price * assignment.share_fraction
    })
    return { person, itemsTotal, taxShare: 0, tipShare: 0, grandTotal: 0 }
  })

  const totalItemsSum = totals.reduce((sum, t) => sum + t.itemsTotal, 0)

  return totals.map((t) => {
    const fraction = totalItemsSum > 0 ? t.itemsTotal / totalItemsSum : 1 / people.length
    const taxShare = tax * fraction
    const tipShare = tip * fraction
    return { ...t, taxShare, tipShare, grandTotal: t.itemsTotal + taxShare + tipShare }
  })
}

export type SavedSplit = {
  id: string
  share_code: string
  restaurant_name: string | null
  total: number
  currency: string
  created_at: string
  person_count: number
}

export function saveSplitToHistory(split: SavedSplit): void {
  if (typeof window === 'undefined') return
  const existing = getSplitHistory()
  const updated = [split, ...existing.filter((s) => s.id !== split.id)]
  localStorage.setItem('splitcheck_history', JSON.stringify(updated.slice(0, 20)))
}

export function getSplitHistory(): SavedSplit[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('splitcheck_history')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export type SavedTrip = {
  id: string
  name: string
  created_at: string
  split_count: number
  total: number
}

export function saveTripToHistory(trip: SavedTrip): void {
  if (typeof window === 'undefined') return
  const existing = getTripHistory()
  const updated = [trip, ...existing.filter((t) => t.id !== trip.id)]
  localStorage.setItem('splitcheck_trips', JSON.stringify(updated.slice(0, 10)))
}

export function getTripHistory(): SavedTrip[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('splitcheck_trips')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function deleteSplitFromHistory(id: string): void {
  if (typeof window === 'undefined') return
  const existing = getSplitHistory()
  localStorage.setItem('splitcheck_history', JSON.stringify(existing.filter((s) => s.id !== id)))
}
