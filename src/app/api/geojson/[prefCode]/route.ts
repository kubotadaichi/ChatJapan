import { EStatGisClient } from '@/lib/geojson/estat-gis'

// Vercel KV は環境変数が設定されている場合のみ使う
async function tryKvGet(key: string): Promise<string | null> {
  try {
    const { kv } = await import('@vercel/kv')
    return await kv.get<string>(key)
  } catch {
    return null
  }
}

async function tryKvSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  try {
    const { kv } = await import('@vercel/kv')
    await kv.set(key, value, { ex: ttlSeconds })
  } catch {
    // KV not configured (local dev), skip
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ prefCode: string }> }
) {
  const { prefCode } = await params

  if (!/^\d{1,2}$/.test(prefCode)) {
    return Response.json({ error: 'Invalid prefCode' }, { status: 400 })
  }

  const cacheKey = EStatGisClient.cacheKey(prefCode)

  // KVキャッシュを確認
  const cached = await tryKvGet(cacheKey)
  if (cached) {
    return new Response(cached, {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // e-Stat GIS API から取得
  const apiKey = process.env.ESTAT_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ESTAT_API_KEY is not configured' }, { status: 500 })
  }

  try {
    const client = new EStatGisClient(apiKey)
    const geojson = await client.fetchMunicipalityGeoJson(prefCode)
    const body = JSON.stringify(geojson)

    // 30日キャッシュ（境界データは変わらない）
    await tryKvSet(cacheKey, body, 30 * 24 * 60 * 60)

    return new Response(body, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return Response.json(
      { error: `Failed to fetch municipality data: ${String(err)}` },
      { status: 502 }
    )
  }
}
