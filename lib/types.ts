export type Person = {
  id: string
  split_id: string
  name: string
  venmo_handle: string | null
  cashapp_handle: string | null
  color: string
}

export type ReceiptItem = {
  id: string
  split_id: string
  name: string
  price: number
}

export type Assignment = {
  id: string
  item_id: string
  person_id: string
  share_fraction: number
}

export type Split = {
  id: string
  created_at: string
  restaurant_name: string | null
  subtotal: number
  tax: number
  tip: number
  total: number
  currency: string
  status: 'assigning' | 'complete'
  share_code: string
}

export type ParsedReceipt = {
  restaurant_name: string | null
  items: { name: string; price: number }[]
  subtotal: number
  tax: number
  tip: number
  total: number
  currency: string
}

export type PersonTotal = {
  person: Person
  itemsTotal: number
  taxShare: number
  tipShare: number
  grandTotal: number
}
