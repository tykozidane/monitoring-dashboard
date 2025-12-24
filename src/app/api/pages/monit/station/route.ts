import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch(`${process.env.APi_BACKEND_URL}/output/all-station`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  })

  const data = await res.json()

  return NextResponse.json(data)
}
