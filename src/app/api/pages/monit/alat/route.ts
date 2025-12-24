import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { c_station } = body

  const res = await fetch(`${process.env.API_BACKEND_URL}/output/device-by-station`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ c_station }),
    cache: 'no-store'
  })

  const data = await res.json()

  return NextResponse.json(data)
}
