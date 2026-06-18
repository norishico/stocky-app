export type ItemStatus = '○' | '△' | '×'
export type ItemCategory = 'food' | 'goods'
export type ExpiryType = '賞味' | '消費'
export type StorageLocation = '冷蔵' | '冷凍' | '常温'

export interface Item {
  id: string
  name: string
  brand?: string
  category: ItemCategory
  status: ItemStatus
  barcode?: string
  imageUrl?: string
  memo?: string
  addedBy: string
  updatedAt: Date
  // food only
  expiryDate?: string // YYYY-MM-DD
  expiryType?: ExpiryType
  storageLocation?: StorageLocation
}

export type ShoppingCategory = 'food' | 'goods' | 'unknown'

export interface ShoppingListItem {
  id: string
  itemId: string | null
  name: string
  imageUrl?: string
  addedAt: Date
  addedBy: string
  checked: boolean
  category: ShoppingCategory
  oneShot?: boolean
}

export interface Household {
  id: string
  name: string
  members: string[]
  createdAt: Date
}

export interface UserDoc {
  uid: string
  householdId?: string
  name: string
  email: string
}
