import { NextRequest, NextResponse } from 'next/server'

interface ProductInfo {
  name: string
  brand?: string
  imageUrl?: string
}

async function fetchRakuten(janCode: string): Promise<ProductInfo | null> {
  const appId = process.env.RAKUTEN_APP_ID
  if (!appId) return null
  try {
    const url = `https://app.rakuten.co.jp/services/api/IchibaProduct/Search/20170714?format=json&applicationId=${appId}&keyword=${encodeURIComponent(janCode)}&hits=1`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const data = await res.json()
    const product = data?.Products?.[0]?.Product
    if (!product?.productName) return null
    return {
      name: product.productName,
      brand: product.makerName ?? undefined,
      imageUrl: product.mediumImageUrl ?? undefined,
    }
  } catch {
    return null
  }
}

async function fetchOpenFoodFacts(janCode: string): Promise<ProductInfo | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(janCode)}?fields=product_name,brands,image_url`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const data = await res.json()
    const p = data?.product
    if (!p?.product_name) return null
    return {
      name: p.product_name,
      brand: p.brands?.split(',')[0]?.trim() ?? undefined,
      imageUrl: p.image_url ?? undefined,
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  // 同一オリジンからのリクエストのみ許可
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (origin && host && !origin.includes(host.split(':')[0])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const code = req.nextUrl.searchParams.get('code')
  if (!code || !/^\d{8,14}$/.test(code)) {
    return NextResponse.json({ error: 'invalid barcode format' }, { status: 400 })
  }

  const result = (await fetchRakuten(code)) ?? (await fetchOpenFoodFacts(code))
  if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return NextResponse.json(result)
}
