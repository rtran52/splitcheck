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
